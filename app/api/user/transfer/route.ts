export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { ethers } from "ethers";
import { decrypt } from "@/lib/crypto";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Import TronWeb pour les transferts USDT TRC20
const TronWebModule = require("tronweb");
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

// Contrat USDT sur TRON (TRC20)
const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
  BNB: "https://bsc-dataseed1.binance.org",
  ETH: "https://cloudflare-eth.com",
  TRON: "https://api.trongrid.io",
};

function getWalletType(currency: string): WalletType {
  if (currency === "PI") return WalletType.PI;
  if (currency === "SDA") return WalletType.SIDRA;
  if (["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND", "MGA"].includes(currency))
    return WalletType.FIAT;
  return WalletType.CRYPTO;
}

function isExternalAddress(identifier: string): boolean {
  const s = (identifier || "").trim();
  if (!s || s.length < 20) return false;
  if (/^G[A-Z2-7]{55}$/.test(s)) return true;
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(s)) return true;
  if (/^r[a-zA-Z0-9]{24,33}$/.test(s)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true;
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(s)) return true;
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(s)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(`transfer:${ip}`, 20, 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter avant de réessayer." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    // Auth
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const senderId = payload.id;

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "PI").toUpperCase().trim();
    const recipientInput = (
      body.recipientIdentifier ||
      body.recipient ||
      body.address ||
      body.email ||
      ""
    ).trim();
    const description = body.description || "";

    if (!recipientInput) {
      return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
    }

    const MIN_CRYPTO_AMOUNT = 0.00000001;
    if (isNaN(amount) || amount < MIN_CRYPTO_AMOUNT) {
      return NextResponse.json(
        { error: `Montant minimum: ${MIN_CRYPTO_AMOUNT}` },
        { status: 400 }
      );
    }

    const feeConfig = await getFeeConfig();
    const { feeAmount: fee, totalDebit } = calculateFee(amount, feeConfig, "transfer");

    // Vérification KYC/AML
    const senderForAml = await prisma.user.findUnique({
      where: { id: senderId },
      select: { kycStatus: true, dailyLimit: true, monthlyLimit: true },
    });
    const kycStatus = senderForAml?.kycStatus || "NONE";
    const AML_TX_LIMITS: Record<string, number> = {
      NONE: 50_000,
      PENDING: 100_000,
      VERIFIED: 5_000_000,
    };
    const txLimit =
      senderForAml?.dailyLimit || AML_TX_LIMITS[kycStatus] || AML_TX_LIMITS["NONE"];
    if (amount > txLimit) {
      return NextResponse.json(
        {
          error: `Limite de transfert dépassée. Maximum autorisé pour votre statut KYC (${kycStatus}) : ${txLimit.toLocaleString()} ${currency}.`,
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 1 : Rechercher le destinataire + débiter en DB + créer la transaction
    //           TOUT dans une transaction Prisma atomique.
    //           Pour les transferts EXTERNES crypto, on crée la transaction en
    //           statut PENDING (pas encore broadcast) afin de pouvoir rembourser
    //           si le broadcast blockchain échoue.
    // ─────────────────────────────────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        const senderUser = await tx.user.findUnique({
          where: { id: senderId },
          select: {
            name: true,
            username: true,
            sidraPrivateKey: true,
            stellarPrivateKey: true,
            piUserId: true,
            usdtPrivateKey: true,
            usdtAddress: true,
          },
        });

        const senderName =
          senderUser?.name || senderUser?.username || "Un utilisateur PimPay";

        const senderWallet = await tx.wallet.findUnique({
          where: { userId_currency: { userId: senderId, currency } },
        });

        if (!senderWallet)
          throw new Error(`Vous n'avez pas de portefeuille ${currency}.`);
        if (senderWallet.balance < totalDebit)
          throw new Error("Solde insuffisant.");

        let cleanInput = recipientInput.startsWith("@")
          ? recipientInput.substring(1)
          : recipientInput;

        // Recherche destinataire (interne PimPay)
        let recipientUser = null;
        if (cleanInput.toUpperCase().startsWith("PIMPAY-")) {
          const userIdPart = cleanInput.replace(/PIMPAY-/i, "").toLowerCase();
          recipientUser = await tx.user.findFirst({
            where: { id: { startsWith: userIdPart } },
          });
        }
        if (!recipientUser) {
          recipientUser = await tx.user.findFirst({
            where: {
              OR: [
                { username: { equals: cleanInput, mode: "insensitive" } },
                { email: { equals: cleanInput, mode: "insensitive" } },
                { phone: cleanInput },
                { sidraAddress: cleanInput },
                { walletAddress: cleanInput },
                { xlmAddress: cleanInput },
                { piUserId: cleanInput },
                { usdtAddress: cleanInput },
                { id: cleanInput },
              ],
            },
          });
        }

        if (recipientUser && recipientUser.id === senderId) {
          throw new Error("Auto-envoi interdit.");
        }

        if (!recipientUser && !isExternalAddress(recipientInput)) {
          throw new Error("Destinataire ou adresse invalide.");
        }

        // Débiter l'expéditeur
        const updatedSender = await tx.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: totalDebit } },
        });

        // ─── Transfert INTERNE ────────────────────────────────────────────
        if (recipientUser) {
          // ✅ FIX INTERNE : on crédite le wallet destinataire en DB.
          // Ce crédit est préservé car syncUsdtBalanceSafe() dans balance/route.ts
          // utilise MAX(onChain, DB) et ne l'écrasera plus.
          const toWallet = await tx.wallet.upsert({
            where: { userId_currency: { userId: recipientUser.id, currency } },
            update: { balance: { increment: amount } },
            create: {
              userId: recipientUser.id,
              currency,
              balance: amount,
              type: getWalletType(currency),
            },
          });

          const transaction = await tx.transaction.create({
            data: {
              reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
              amount,
              fee,
              netAmount: amount,
              currency,
              type: TransactionType.TRANSFER,
              status: TransactionStatus.SUCCESS,
              fromUserId: senderId,
              toUserId: recipientUser.id,
              fromWalletId: updatedSender.id,
              toWalletId: toWallet.id,
              description:
                description ||
                `Transfert interne vers @${recipientUser.username}`,
            },
          });

          await tx.notification
            .create({
              data: {
                userId: recipientUser.id,
                title: "Paiement recu !",
                message: `Vous avez recu ${amount.toLocaleString()} ${currency} de ${senderName}.`,
                type: "PAYMENT_RECEIVED",
                metadata: {
                  amount,
                  currency,
                  senderName,
                  reference: transaction.reference,
                },
              },
            })
            .catch(() => {});

          return {
            type: "INTERNAL" as const,
            transaction,
            newBalance: updatedSender.balance,
            senderUser,
          };
        }

        // ─── Transfert EXTERNE ───────────────────────────────────────────
        // ✅ FIX EXTERNE : on crée la transaction en PENDING ici.
        // Le broadcast blockchain a lieu HORS de cette transaction Prisma
        // (ci-dessous) afin que si le broadcast échoue, on puisse rembourser
        // sans être bloqué par un timeout Prisma.

        const txDescription =
          currency === "PI"
            ? `Retrait PI vers adresse externe : ${recipientInput}`
            : description || `Retrait ${currency} vers adresse externe : ${recipientInput}`;

        // Pour PI, le worker prend le relais → on crée SUCCESS + QUEUED directement
        const initialStatus =
          currency === "PI" ? TransactionStatus.SUCCESS : TransactionStatus.PENDING;

        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            fee,
            netAmount: amount,
            currency,
            type: TransactionType.WITHDRAW,
            status: initialStatus,
            statusClass: "QUEUED",
            blockchainTx: null,
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description: txDescription,
            accountNumber: recipientInput,
            metadata:
              currency === "PI"
                ? {
                    externalAddress: recipientInput,
                    toAddress: recipientInput,
                    network: "Pi Network",
                    pendingWithdrawal: true,
                    isBlockchainWithdraw: true,
                    requestedAt: new Date().toISOString(),
                    ...(senderUser?.piUserId && { piUid: senderUser.piUserId }),
                  }
                : currency === "USDT"
                ? {
                    externalAddress: recipientInput,
                    toAddress: recipientInput,
                    network: "TRON TRC20",
                    isBlockchainWithdraw: true,
                    requestedAt: new Date().toISOString(),
                  }
                : {
                    externalAddress: recipientInput,
                    network: currency,
                    isBlockchainWithdraw: true,
                    requestedAt: new Date().toISOString(),
                  },
          },
        });

        if (currency === "PI") {
          await tx.notification
            .create({
              data: {
                userId: senderId,
                title: "Retrait Pi en cours de traitement",
                message: `Votre retrait de ${amount} PI vers ${recipientInput.substring(0, 8)}...${recipientInput.substring(recipientInput.length - 4)} est en file d'attente.`,
                type: "WITHDRAW_PENDING",
                metadata: { amount, currency, toAddress: recipientInput },
              },
            })
            .catch(() => {});
        }

        return {
          type: "EXTERNAL" as const,
          transaction,
          newBalance: updatedSender.balance,
          senderUser,
        };
      },
      { maxWait: 5000, timeout: 20000 }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 2 (EXTERNE seulement) : Broadcast blockchain HORS transaction Prisma
    // Si le broadcast échoue → on rembourse le sender et on marque FAILED.
    // ─────────────────────────────────────────────────────────────────────────
    if (result.type === "EXTERNAL" && result.transaction.currency !== "PI") {
      const { senderUser } = result;
      let blockchainTxHash: string | null = null;
      let broadcastError: string | null = null;

      try {
        const currency = result.transaction.currency;

        // ── SDA / SIDRA ──────────────────────────────────────────────────
        if ((currency === "SDA" || currency === "SIDRA") && senderUser?.sidraPrivateKey) {
          let privateKey = senderUser.sidraPrivateKey;
          if (privateKey.includes(":")) privateKey = decrypt(privateKey);
          if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
          if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey))
            throw new Error("Format de clé SDA/EVM invalide");

          const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
          const wallet = new ethers.Wallet(privateKey, provider);
          const txRes = await wallet.sendTransaction({
            to: recipientInput,
            value: ethers.parseEther(result.transaction.amount.toString()),
          });
          const receipt = await txRes.wait();
          blockchainTxHash = receipt?.hash || txRes.hash;
        }

        // ── BNB / ETH ────────────────────────────────────────────────────
        if (["BNB", "ETH"].includes(currency) && senderUser?.sidraPrivateKey) {
          let privateKey = senderUser.sidraPrivateKey;
          if (privateKey.includes(":")) privateKey = decrypt(privateKey);
          if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
          if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey))
            throw new Error(`Format de clé ${currency}/EVM invalide`);

          const rpcUrl = RPC_URLS[currency];
          if (!rpcUrl) throw new Error(`Pas de RPC configuré pour ${currency}`);

          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const wallet = new ethers.Wallet(privateKey, provider);
          const amountStr = result.transaction.amount
            .toFixed(18)
            .replace(/\.?0+$/, "");
          const amountInWei = ethers.parseEther(amountStr);

          let gasLimit: bigint;
          let gasPrice: bigint;
          try {
            gasLimit = await provider.estimateGas({
              from: wallet.address,
              to: recipientInput,
              value: amountInWei,
            });
            const feeData = await provider.getFeeData();
            gasPrice = feeData.gasPrice ?? ethers.parseUnits("5", "gwei");
          } catch {
            gasLimit = BigInt(21000);
            gasPrice = ethers.parseUnits("5", "gwei");
          }

          const onChainBalance = await provider.getBalance(wallet.address);
          if (onChainBalance < amountInWei + gasLimit * gasPrice) {
            throw new Error(`Solde ${currency} on-chain insuffisant.`);
          }

          const txRes = await wallet.sendTransaction({
            to: recipientInput,
            value: amountInWei,
            gasLimit,
            gasPrice,
          });
          const receipt = await txRes.wait();
          blockchainTxHash = receipt?.hash || txRes.hash;
        }

        // ── USDT TRC20 ───────────────────────────────────────────────────
        if (currency === "USDT" && senderUser?.usdtPrivateKey) {
          let privateKey = senderUser.usdtPrivateKey;
          if (privateKey.includes(":")) privateKey = decrypt(privateKey);

          const tronWeb = new TronWeb({
            fullHost: RPC_URLS.TRON,
            privateKey,
          });

          const trxBalance = await tronWeb.trx.getBalance(senderUser.usdtAddress);
          if (trxBalance / 1_000_000 < 10) {
            throw new Error(
              `Solde TRX insuffisant pour les frais. Minimum requis: ~10 TRX.`
            );
          }

          const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
          const usdtBalance = await contract
            .balanceOf(senderUser.usdtAddress)
            .call();
          if (Number(usdtBalance) / 1_000_000 < result.transaction.amount) {
            throw new Error(
              `Solde USDT on-chain insuffisant. Disponible: ${(Number(usdtBalance) / 1_000_000).toFixed(2)} USDT.`
            );
          }

          const amountInSun = Math.floor(result.transaction.amount * 1_000_000);
          const txResult = await contract
            .transfer(recipientInput, amountInSun)
            .send({ feeLimit: 100_000_000, callValue: 0 });
          blockchainTxHash = txResult;
        }
      } catch (e: any) {
        broadcastError = e.message;
        console.error("[USER_TRANSFER] Broadcast échoué:", e.message);
      }

      if (blockchainTxHash) {
        // ✅ Broadcast réussi → marquer SUCCESS avec le hash
        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            statusClass: undefined,
            blockchainTx: blockchainTxHash,
            metadata: {
              ...(result.transaction.metadata as object),
              confirmedAt: new Date().toISOString(),
            },
          },
        });
        result.transaction.blockchainTx = blockchainTxHash;
      } else {
        // ✅ FIX ROLLBACK : Broadcast échoué → rembourser + marquer FAILED
        console.warn("[USER_TRANSFER] Remboursement du sender suite à l'échec broadcast");
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId_currency: { userId: senderId, currency: result.transaction.currency } },
            data: { balance: { increment: totalDebit } },
          }),
          prisma.transaction.update({
            where: { id: result.transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              statusClass: "BROADCAST_FAILED",
              description: `[ÉCHEC] ${broadcastError || "Erreur blockchain"}`,
            },
          }),
        ]);

        return NextResponse.json(
          {
            error: `Transfert annulé : ${broadcastError || "Erreur blockchain"}. Votre solde a été restitué.`,
          },
          { status: 400 }
        );
      }
    }

    // Déclencher le worker Pi si nécessaire
    if (result.type === "EXTERNAL" && result.transaction.currency === "PI") {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
        "http://localhost:3000";

      fetch(`${baseUrl}/api/worker/process`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.WORKER_SECRET || ""}`,
          "x-internal-request": "true",
        },
      }).catch((err) => {
        console.error("[TRANSFER] Erreur appel worker:", err.message);
      });
    }

    // Auto-conversion des frais
    if (result.transaction.fee && result.transaction.fee > 0) {
      autoConvertFeeToPi(
        result.transaction.fee,
        result.transaction.currency,
        result.transaction.id,
        result.transaction.reference
      ).catch((err) => {
        console.error("[USER_TRANSFER] Fee conversion error:", err.message);
      });
    }

    return NextResponse.json({
      success: true,
      mode: result.type,
      transaction: result.transaction,
      blockchainTx: result.transaction.blockchainTx || null,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("[USER_TRANSFER] ERREUR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur" },
      { status: 400 }
    );
  }
}
