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
import { collectFeeOnChain, FEE_COLLECTED_CURRENCIES } from "@/lib/fee-collector";
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
  // UID Pi Network préfixé "P" (ex: P024E6679F8C1093533EC99EB75548CCBFF995FEE)
  if (/^P[0-9A-Fa-f]{20,}$/.test(s)) return true;
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(s)) return true;
  if (/^r[a-zA-Z0-9]{24,33}$/.test(s)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true;
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(s)) return true;
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(s)) return true;
  return false;
}

/**
 * Retourne la clé privée opérateur SDA depuis les variables d'environnement.
 * Le wallet opérateur est le wallet PimPay central qui signe toutes les sorties SDA.
 * Configurez SIDRA_OPERATOR_PRIVATE_KEY dans votre .env / Vercel env vars.
 */
function getSidraOperatorKey(): string | null {
  const key = process.env.SIDRA_OPERATOR_PRIVATE_KEY;
  if (!key) return null;
  let k = key.trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  if (!/^0x[a-fA-F0-9]{64}$/.test(k)) return null;
  return k;
}

/**
 * Diffuse réellement un transfert TRX (natif) ou USDT (TRC20) sur la blockchain
 * TRON depuis le wallet Tron de l'expéditeur vers une adresse Tron destinataire.
 *
 * Utilisé pour :
 *   - les retraits EXTERNES (adresse hors PimPay)
 *   - les transferts INTERNES TRX/USDT (membre PimPay possédant une adresse Tron)
 *     afin que le solde reçu soit AUSSI visible on-chain sur TRON.
 *
 * Retourne le hash de la transaction blockchain. Lève une erreur en cas d'échec
 * (solde on-chain insuffisant, frais/énergie manquants, broadcast rejeté…).
 */
async function broadcastTronTransfer(opts: {
  currency: "TRX" | "USDT";
  privateKey: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
}): Promise<string> {
  const { currency, privateKey, fromAddress, toAddress, amount } = opts;
  const tronWeb = new TronWeb({ fullHost: RPC_URLS.TRON, privateKey });

  // ── TRX natif ──────────────────────────────────────────────────────────
  if (currency === "TRX") {
    const trxBalanceSun = await tronWeb.trx.getBalance(fromAddress);
    const amountInSun = Math.floor(amount * 1_000_000);
    const estimatedFeeSun = 1_000_000;

    if (trxBalanceSun < amountInSun + estimatedFeeSun) {
      throw new Error(
        `Solde TRX on-chain insuffisant. Disponible: ${(trxBalanceSun / 1_000_000).toFixed(2)} TRX.`
      );
    }

    const txResult = await tronWeb.trx.sendTransaction(toAddress, amountInSun);
    if (txResult.result) return txResult.txid;
    throw new Error(txResult.message || "Échec de la transaction TRX");
  }

  // ── USDT TRC20 ─────────────────────────────────────────────────────────
  const trxBalance = await tronWeb.trx.getBalance(fromAddress);
  if (trxBalance / 1_000_000 < 10) {
    throw new Error("Solde TRX insuffisant pour les frais. Minimum requis: ~10 TRX.");
  }

  const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
  const usdtBalance = await contract.balanceOf(fromAddress).call();
  if (Number(usdtBalance) / 1_000_000 < amount) {
    throw new Error(
      `Solde USDT on-chain insuffisant. Disponible: ${(Number(usdtBalance) / 1_000_000).toFixed(2)} USDT.`
    );
  }

  const amountInSun = Math.floor(amount * 1_000_000);
  const txResult = await contract
    .transfer(toAddress, amountInSun)
    .send({ feeLimit: 100_000_000, callValue: 0 });
  return txResult;
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
    // ─────────────────────────────────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        const senderUser = await tx.user.findUnique({
          where: { id: senderId },
          select: {
            name: true,
            username: true,
            sidraPrivateKey: true,
            sidraAddress: true,
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

        // UID Pi Network préfixé "P" : on prépare aussi la version sans le "P"
        // pour résoudre un membre PimPay dont le piUserId/walletAddress est stocké
        // sans préfixe (ex: P024E6679... -> 024E6679...).
        const cleanInputNoP = /^P[0-9A-Fa-f]{20,}$/.test(cleanInput)
          ? cleanInput.slice(1)
          : cleanInput;

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
                { walletAddress: cleanInputNoP },
                { xlmAddress: cleanInput },
                { piUserId: cleanInput },
                { piUserId: cleanInputNoP },
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

        // Débiter l'expéditeur (solde interne DB — indépendant du wallet on-chain)
        const updatedSender = await tx.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: totalDebit } },
        });

        // ─── Transfert INTERNE (P2P entre utilisateurs PimPay) ───────────
        // Mise à jour des soldes DB. Pour TRX/USDT, si le destinataire possède
        // une adresse TRON, on diffusera AUSSI le transfert sur la blockchain
        // TRON (hors transaction Prisma) afin que le solde reçu soit visible
        // on-chain. Le broadcast on-chain est tenté à l'ÉTAPE 2.
        if (recipientUser) {
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

          // ── RÈGLE MÉTIER ────────────────────────────────────────────────
          // TRX et USDT DOIVENT TOUJOURS passer par la blockchain TRON, même
          // en interne. Un transfert interne TRX/USDT n'est donc valide que si
          // l'expéditeur ET le destinataire possèdent une adresse TRON réelle.
          // Sinon on REJETTE (le throw annule toute la transaction Prisma →
          // aucun solde n'est débité).
          const recipientTronAddress = recipientUser.usdtAddress || null;
          const isTronCurrency = currency === "TRX" || currency === "USDT";

          if (isTronCurrency) {
            if (!senderUser?.usdtPrivateKey || !senderUser?.usdtAddress) {
              throw new Error(
                "Votre portefeuille TRON n'est pas initialisé. Impossible d'envoyer du " +
                  `${currency} on-chain. Contactez le support.`
              );
            }
            if (
              !recipientTronAddress ||
              !/^T[a-zA-Z0-9]{33}$/.test(recipientTronAddress)
            ) {
              throw new Error(
                `Le destinataire ne possède pas d'adresse TRON valide. ` +
                  `Les transferts ${currency} doivent obligatoirement passer par la blockchain TRON.`
              );
            }
          }

          const isTronInternal = isTronCurrency;

          const transaction = await tx.transaction.create({
            data: {
              reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
              amount,
              fee,
              netAmount: amount,
              currency,
              type: TransactionType.TRANSFER,
              status: TransactionStatus.SUCCESS,
              // Pour un transfert interne TRON, on garde une trace "QUEUED"
              // tant que le broadcast on-chain n'est pas confirmé.
              statusClass: isTronInternal ? "QUEUED" : undefined,
              fromUserId: senderId,
              toUserId: recipientUser.id,
              fromWalletId: updatedSender.id,
              toWalletId: toWallet.id,
              description:
                description ||
                `Transfert interne vers @${recipientUser.username}`,
              metadata: isTronInternal
                ? {
                    internalOnChain: true,
                    network: currency === "USDT" ? "TRON TRC20" : "TRON Mainnet",
                    toAddress: recipientTronAddress,
                    recipientTronAddress,
                    requestedAt: new Date().toISOString(),
                  }
                : undefined,
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
            // Infos pour le broadcast on-chain TRON (étape 2)
            internalOnChain: isTronInternal,
            recipientTronAddress: isTronInternal ? recipientTronAddress : null,
            // Infos nécessaires au remboursement si le broadcast on-chain échoue
            recipientUserId: recipientUser.id,
            recipientWalletId: toWallet.id,
          };
        }

        // ─── Transfert EXTERNE (vers blockchain) ─────────────────────────
        // Le solde DB a déjà été débité ci-dessus.
        // Le broadcast blockchain aura lieu HORS de cette transaction Prisma.
        const txDescription =
          currency === "PI"
            ? `Retrait PI vers adresse externe : ${recipientInput}`
            : description || `Retrait ${currency} vers adresse externe : ${recipientInput}`;

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
                : currency === "SDA" || currency === "SIDRA"
                ? {
                    externalAddress: recipientInput,
                    toAddress: recipientInput,
                    network: "Sidra Mainnet",
                    isBlockchainWithdraw: true,
                    // FIX : marqué paidByOperator pour que le sync ne re-crédite pas l'utilisateur
                    paidByOperator: true,
                    requestedAt: new Date().toISOString(),
                  }
                : currency === "USDT"
                ? {
                    externalAddress: recipientInput,
                    toAddress: recipientInput,
                    network: "TRON TRC20",
                    isBlockchainWithdraw: true,
                    requestedAt: new Date().toISOString(),
                  }
                : currency === "TRX"
                ? {
                    externalAddress: recipientInput,
                    toAddress: recipientInput,
                    network: "TRON Mainnet",
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
    // ─────────────────────────────────────────────────────────────────────────
    if (result.type === "EXTERNAL" && result.transaction.currency !== "PI") {
      const { senderUser } = result;
      let blockchainTxHash: string | null = null;
      let broadcastError: string | null = null;

      try {
        const currency = result.transaction.currency;

        // ── SDA / SIDRA ──────────────────────────────────────────────────
        // IMPORTANT (architecture centralisée) :
        //   - Le solde DB de l'utilisateur a DÉJÀ été débité à l'étape 1.
        //   - Le broadcast blockchain utilise UNIQUEMENT le wallet opérateur central
        //     (SIDRA_OPERATOR_PRIVATE_KEY). C'est ce wallet qui détient les fonds on-chain.
        //   - Le wallet personnel de l'utilisateur N'EST PLUS utilisé en fallback,
        //     car depuis la centralisation il ne contient plus de SDA on-chain.
        //   - Si l'opérateur est insuffisant, on annule et on rembourse l'utilisateur.
        if (currency === "SDA" || currency === "SIDRA") {
          const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
          const amountInWei = ethers.parseEther(result.transaction.amount.toString());

          // Estimer le gas
          let gasLimit = BigInt(21000);
          let gasPrice = ethers.parseUnits("1", "gwei");
          try {
            const feeData = await provider.getFeeData();
            if (feeData.gasPrice) gasPrice = feeData.gasPrice;
          } catch { /* garder les valeurs par défaut */ }

          const totalNeeded = amountInWei + gasLimit * gasPrice;

          // Wallet opérateur central (SIDRA_OPERATOR_PRIVATE_KEY) — seul wallet autorisé
          const operatorKey = getSidraOperatorKey();

          if (!operatorKey) {
            // Pas de clé opérateur configurée → annuler
            throw new Error(
              "Le service de retrait SDA n'est pas configuré (SIDRA_OPERATOR_PRIVATE_KEY manquant). Contactez le support."
            );
          }

          const operatorWallet = new ethers.Wallet(operatorKey, provider);
          const operatorBalance = await provider.getBalance(operatorWallet.address);
          const operatorBalanceStr = parseFloat(ethers.formatEther(operatorBalance)).toFixed(6);

          if (operatorBalance < totalNeeded) {
            // Solde opérateur insuffisant → annuler et rembourser (géré ci-dessous)
            throw new Error(
              `Retrait SDA temporairement indisponible : le wallet opérateur est insuffisant ` +
              `(${operatorBalanceStr} SDA disponible, ` +
              `${parseFloat(ethers.formatEther(totalNeeded)).toFixed(6)} SDA requis). ` +
              `Veuillez contacter le support.`
            );
          }

          // Broadcast depuis le wallet opérateur
          console.log(`[SDA_TRANSFER] Broadcasting via OPERATOR wallet: ${operatorWallet.address}`);
          const txRes = await operatorWallet.sendTransaction({
            to: recipientInput,
            value: amountInWei,
            gasLimit,
            gasPrice,
          });
          const receipt = await txRes.wait();
          blockchainTxHash = receipt?.hash || txRes.hash;
          console.log(`[SDA_TRANSFER] Success — txHash: ${blockchainTxHash}`);
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
          const amountInWei = ethers.parseEther(
            result.transaction.amount.toFixed(18).replace(/\.?0+$/, "")
          );

          let gasLimit = BigInt(21000);
          let gasPrice = ethers.parseUnits("5", "gwei");
          try {
            gasLimit = await provider.estimateGas({
              from: wallet.address,
              to: recipientInput,
              value: amountInWei,
            });
            const feeData = await provider.getFeeData();
            gasPrice = feeData.gasPrice ?? gasPrice;
          } catch { /* garder les valeurs par défaut */ }

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

        // ── TRX (TRON natif) ─────────────────────────────────────────────
        if (currency === "TRX" && senderUser?.usdtPrivateKey && senderUser?.usdtAddress) {
          let privateKey = senderUser.usdtPrivateKey;
          if (privateKey.includes(":")) privateKey = decrypt(privateKey);

          blockchainTxHash = await broadcastTronTransfer({
            currency: "TRX",
            privateKey,
            fromAddress: senderUser.usdtAddress,
            toAddress: recipientInput,
            amount: result.transaction.amount,
          });
        }

        // ── USDT TRC20 ───────────────────────────────────────────────────
        if (currency === "USDT" && senderUser?.usdtPrivateKey && senderUser?.usdtAddress) {
          let privateKey = senderUser.usdtPrivateKey;
          if (privateKey.includes(":")) privateKey = decrypt(privateKey);

          blockchainTxHash = await broadcastTronTransfer({
            currency: "USDT",
            privateKey,
            fromAddress: senderUser.usdtAddress,
            toAddress: recipientInput,
            amount: result.transaction.amount,
          });
        }
      } catch (e: any) {
        broadcastError = e.message;
        console.error("[USER_TRANSFER] Broadcast échoué:", e.message);
      }

      if (blockchainTxHash) {
        // ✅ Broadcast réussi → marquer SUCCESS avec le hash blockchain
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
        // ✅ Broadcast échoué → rembourser l'utilisateur + marquer FAILED
        // Le solde DB avait été débité à l'étape 1 ; on le restitue ici.
        console.warn("[USER_TRANSFER] Remboursement du sender suite à l'échec broadcast");
        await prisma.$transaction([
          prisma.wallet.update({
            where: {
              userId_currency: {
                userId: senderId,
                currency: result.transaction.currency,
              },
            },
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

    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 2-bis (INTERNE TRON) : Réplication on-chain du transfert interne
    // ─────────────────────────────────────────────────────────────────────────
    // Le destinataire a DÉJÀ été crédité en DB (étape 1). On diffuse en plus le
    // transfert sur la blockchain TRON vers son adresse Tron pour que le solde
    // reçu soit visible on-chain (comme un transfert sortant vers un wallet
    // externe). Best-effort : si le broadcast échoue (gas/énergie insuffisants),
    // le transfert interne reste valide en DB — on ne rembourse pas, on note
    // simplement l'échec on-chain dans la transaction.
    if (
      result.type === "INTERNAL" &&
      result.internalOnChain &&
      result.recipientTronAddress &&
      result.senderUser?.usdtPrivateKey &&
      result.senderUser?.usdtAddress
    ) {
      const currency = result.transaction.currency as "TRX" | "USDT";
      let blockchainTxHash: string | null = null;
      let broadcastError: string | null = null;

      try {
        let privateKey = result.senderUser.usdtPrivateKey;
        if (privateKey.includes(":")) privateKey = decrypt(privateKey);

        blockchainTxHash = await broadcastTronTransfer({
          currency,
          privateKey,
          fromAddress: result.senderUser.usdtAddress,
          toAddress: result.recipientTronAddress,
          amount: result.transaction.amount,
        });
      } catch (e: any) {
        broadcastError = e.message;
        console.error("[USER_TRANSFER] Broadcast on-chain interne échoué:", e.message);
      }

      await prisma.transaction
        .update({
          where: { id: result.transaction.id },
          data: blockchainTxHash
            ? {
                statusClass: undefined,
                blockchainTx: blockchainTxHash,
                metadata: {
                  ...(result.transaction.metadata as object),
                  onChainConfirmed: true,
                  confirmedAt: new Date().toISOString(),
                },
              }
            : {
                // L'argent est bien crédité en DB ; seul le miroir on-chain a échoué.
                statusClass: "ONCHAIN_FAILED",
                metadata: {
                  ...(result.transaction.metadata as object),
                  onChainConfirmed: false,
                  onChainError: broadcastError || "Broadcast TRON échoué",
                },
              },
        })
        .catch(() => {});

      if (blockchainTxHash) {
        result.transaction.blockchainTx = blockchainTxHash;
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

    // ── Collecte on-chain des frais vers l'adresse centrale du réseau ──
    // EVM (BNB, ETH, USDC, DAI, BUSD, SDA) → envoi réel via la clé EVM.
    // TRX/USDT (TRON) et XLM/PI (Stellar) sont routés vers leur adresse
    // centrale dédiée et collectés par les opérateurs TRON / Pi.
    const feeCurrency = result.transaction.currency?.toUpperCase();
    const feeAmount = result.transaction.fee ?? 0;
    const { senderUser } = result;

    if (
      feeAmount > 0 &&
      FEE_COLLECTED_CURRENCIES.includes(feeCurrency as any)
    ) {
      const getEvmKey = (): string | null => {
        if (!senderUser?.sidraPrivateKey) return null;
        try {
          const { decrypt } = require("@/lib/crypto");
          let k: string = senderUser.sidraPrivateKey;
          if (k.includes(":")) k = decrypt(k);
          if (!k.startsWith("0x")) k = "0x" + k;
          if (!/^0x[a-fA-F0-9]{64}$/.test(k)) return null;
          return k;
        } catch {
          return null;
        }
      };

      const evmKey = getEvmKey();
      if (evmKey) {
        collectFeeOnChain(feeCurrency, feeAmount, evmKey).catch((err) => {
          console.error("[USER_TRANSFER] Fee collect error:", err.message);
        });
      }
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
