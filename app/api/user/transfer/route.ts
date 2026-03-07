export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { ethers } from "ethers";
import { decrypt } from "@/lib/crypto";
import * as StellarSdk from "@stellar/stellar-sdk";

// Configuration RPC pour les blockchains supportées
const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
};

// Pi Network Horizon API (Mainnet)
const PI_HORIZON_URL = "https://api.mainnet.minepi.com";
const PI_NETWORK_PASSPHRASE = "Pi Network";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect wallet type from currency code (aligned with Prisma enum WalletType) */
function getWalletType(currency: string): WalletType {
  if (currency === "PI") return WalletType.PI;
  if (currency === "SDA") return WalletType.SIDRA;
  if (["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND"].includes(currency))
    return WalletType.FIAT;
  return WalletType.CRYPTO;
}

/** Check if an identifier looks like a blockchain address (external) */
function isExternalAddress(identifier: string): boolean {
  const s = (identifier || "").trim();
  if (!s || s.length < 20) return false;

  if (/^G[A-Z2-7]{55}$/.test(s)) return true;           // Stellar / Pi
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return true;        // EVM / Sidra
  if (/^T[a-zA-Z0-9]{33}$/.test(s)) return true;          // TRON
  if (/^r[a-zA-Z0-9]{24,33}$/.test(s)) return true;       // XRP
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true; // Solana / BTC
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(s)) return true; // BTC bech32
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(s)) return true; // LTC

  return false;
}

// ---------------------------------------------------------------------------
// POST  /api/user/transfer
// Handles INTERNAL (between PimPay users) and EXTERNAL (blockchain withdraw)
// for ALL currencies.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // ── 1. AUTH ──────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = (payload.id || payload.userId) as string;

    if (!senderId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // ── 2. PARSE BODY ───────────────────────────────────────────────────────
    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "XAF").toUpperCase().trim();
    const recipientInput = (
      body.recipientIdentifier || body.recipient || body.address || ""
    ).trim();
    const description = body.description || "";

    if (!recipientInput) {
      return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // ── 3. FEE centralisé ─────────────────────────────────────────────────
    const feeConfig = await getFeeConfig();
    const { feeRate, feeAmount: fee, totalDebit } = calculateFee(amount, feeConfig, "transfer");

    // ── 4. ATOMIC TRANSACTION ───────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // A. Verify sender wallet & balance
        const senderWallet = await tx.wallet.findUnique({
          where: { userId_currency: { userId: senderId, currency } },
        });

        if (!senderWallet) {
          throw new Error(`Vous n'avez pas de portefeuille ${currency}.`);
        }

        if (senderWallet.balance < totalDebit) {
          throw new Error(
            `Solde insuffisant. Disponible: ${senderWallet.balance.toLocaleString()} ${currency}, requis: ${totalDebit.toLocaleString()} ${currency} (montant + frais).`
          );
        }

        // B. Try to find a PimPay user matching the input
        const cleanInput = recipientInput.startsWith("@")
          ? recipientInput.substring(1)
          : recipientInput;

        const recipientUser = await tx.user.findFirst({
          where: {
            OR: [
              { username: { equals: cleanInput, mode: "insensitive" } },
              { email: { equals: cleanInput, mode: "insensitive" } },
              { phone: cleanInput },
              { sidraAddress: cleanInput },
              { walletAddress: cleanInput },
              { piUserId: cleanInput },
              { usdtAddress: cleanInput },
              { solAddress: cleanInput },
              { xrpAddress: cleanInput },
              { xlmAddress: cleanInput },
            ],
          },
        });

        // C. Debit sender
        const updatedSender = await tx.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: totalDebit } },
        });

        // ── INTERNAL TRANSFER (recipient is a PimPay user) ──────────────────
        if (recipientUser && recipientUser.id !== senderId) {
          // Credit recipient wallet (create if not exists)
          const toWallet = await tx.wallet.upsert({
            where: {
              userId_currency: { userId: recipientUser.id, currency },
            },
            update: { balance: { increment: amount } },
            create: {
              userId: recipientUser.id,
              currency,
              balance: amount,
              type: getWalletType(currency),
            },
          });

          // Create SUCCESS transaction
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
                `Transfert interne ${currency} vers @${recipientUser.username || "membre"}`,
            },
          });

          // Update global stats
          await tx.systemConfig
            .update({
              where: { id: "GLOBAL_CONFIG" },
              data: {
                totalVolumePi: { increment: currency === "PI" ? amount : 0 },
                totalProfit: { increment: fee },
              },
            })
            .catch(() => {});

          // Notification for recipient
          await tx.notification
            .create({
              data: {
                userId: recipientUser.id,
                title: "Fonds recus",
                message: `Vous avez recu ${amount.toLocaleString()} ${currency} d'un membre PimPay.`,
                type: "payment_received",
              },
            })
            .catch(() => {});

          return { type: "INTERNAL" as const, transaction };
        }

        // Self-transfer guard
        if (recipientUser && recipientUser.id === senderId) {
          // Rollback the debit by re-crediting
          await tx.wallet.update({
            where: { id: senderWallet.id },
            data: { balance: { increment: totalDebit } },
          });
          throw new Error("Vous ne pouvez pas vous envoyer des fonds.");
        }

        // ── EXTERNAL TRANSFER (blockchain withdraw) ──────────────────────────
        // Only proceed if it actually looks like a valid address
        if (!isExternalAddress(recipientInput)) {
          // Rollback the debit
          await tx.wallet.update({
            where: { id: senderWallet.id },
            data: { balance: { increment: totalDebit } },
          });
          throw new Error(
            "Destinataire introuvable sur PimPay et l'adresse ne correspond a aucun reseau blockchain connu."
          );
        }

        // Pour SDA/SIDRA et PI, on execute le transfert blockchain immediatement
        let blockchainTxHash: string | null = null;
        let txStatus = TransactionStatus.PENDING;

        if (currency === "SDA" || currency === "SIDRA") {
          // Recuperer les infos de l'expediteur pour la cle privee
          const senderUser = await tx.user.findUnique({
            where: { id: senderId },
            select: { sidraPrivateKey: true, sidraAddress: true }
          });

          if (senderUser?.sidraPrivateKey) {
            try {
              // Dechiffrer la cle privee
              let privateKey = senderUser.sidraPrivateKey;
              if (privateKey.includes(':')) {
                privateKey = decrypt(privateKey);
              }
              if (!privateKey.startsWith('0x')) {
                privateKey = '0x' + privateKey;
              }

              // Executer le transfert sur Sidra Chain
              const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
              const wallet = new ethers.Wallet(privateKey, provider);
              
              const txResponse = await wallet.sendTransaction({
                to: recipientInput,
                value: ethers.parseEther(amount.toString())
              });

              // Attendre la confirmation
              const receipt = await txResponse.wait();
              blockchainTxHash = receipt?.hash || txResponse.hash;
              txStatus = TransactionStatus.SUCCESS;

            } catch (blockchainError: any) {
              console.error("[BLOCKCHAIN_ERROR]:", blockchainError.message);
              // En cas d'echec blockchain, on rembourse l'utilisateur
              await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { increment: totalDebit } },
              });
              throw new Error(`Erreur blockchain: ${blockchainError.message || "Transaction echouee"}`);
            }
          }
        }

        // Pour PI Network, utiliser Stellar SDK
        if (currency === "PI") {
          // Validation de l'adresse Pi (format Stellar Ed25519)
          if (!StellarSdk.StrKey.isValidEd25519PublicKey(recipientInput)) {
            await tx.wallet.update({
              where: { id: senderWallet.id },
              data: { balance: { increment: totalDebit } },
            });
            throw new Error("Adresse Pi Network invalide. Verifiez le format.");
          }

          // Recuperer les cles Pi de l'expediteur
          const senderUser = await tx.user.findUnique({
            where: { id: senderId },
            select: { 
              stellarPrivateKey: true, 
              xlmAddress: true,
              walletAddress: true 
            }
          });

          // Verifier si l'utilisateur a une cle privee configuree
          if (!senderUser?.stellarPrivateKey) {
            // Pas de cle privee = transaction PENDING pour traitement manuel/admin
            console.log("[PI_TRANSFER] Cle privee non configuree, transaction en attente");
          } else {
            try {
              // Dechiffrer la cle privee si elle est encryptee
              let privateKey = senderUser.stellarPrivateKey;
              if (privateKey.includes(':')) {
                privateKey = decrypt(privateKey);
              }

              // Creer le keypair depuis la cle privee
              const sourceKeypair = StellarSdk.Keypair.fromSecret(privateKey);
              const sourcePublicKey = sourceKeypair.publicKey();

              // Connexion au serveur Horizon Pi
              const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
              
              // Charger le compte source
              const sourceAccount = await server.loadAccount(sourcePublicKey);

              // Construire la transaction
              const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: PI_NETWORK_PASSPHRASE,
              })
                .addOperation(
                  StellarSdk.Operation.payment({
                    destination: recipientInput,
                    asset: StellarSdk.Asset.native(), // Pi utilise l'asset natif
                    amount: amount.toFixed(7), // Stellar utilise 7 decimales max
                  })
                )
                .addMemo(StellarSdk.Memo.text(description.slice(0, 28) || "PimPay Transfer"))
                .setTimeout(180) // 3 minutes timeout
                .build();

              // Signer la transaction
              transaction.sign(sourceKeypair);

              // Soumettre a la blockchain Pi
              const result = await server.submitTransaction(transaction);
              blockchainTxHash = result.hash;
              txStatus = TransactionStatus.SUCCESS;

              console.log("[PI_TRANSFER_SUCCESS] Hash:", blockchainTxHash);

            } catch (piError: any) {
              console.error("[PI_BLOCKCHAIN_ERROR]:", piError.message || piError);
              
              // Analyser l'erreur pour un message plus clair
              let errorMsg = "Erreur lors du transfert Pi";
              
              if (piError?.response?.data?.extras?.result_codes) {
                const codes = piError.response.data.extras.result_codes;
                if (codes.operations?.includes("op_underfunded")) {
                  errorMsg = "Solde insuffisant sur la blockchain Pi";
                } else if (codes.operations?.includes("op_no_destination")) {
                  errorMsg = "Le compte destinataire n'existe pas sur Pi Network";
                } else if (codes.transaction === "tx_bad_auth") {
                  errorMsg = "Erreur d'authentification blockchain";
                }
              } else if (piError.message?.includes("Network request failed")) {
                errorMsg = "Impossible de se connecter au reseau Pi. Reessayez.";
              }

              // Rembourser l'utilisateur en cas d'echec
              await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { increment: totalDebit } },
              });
              throw new Error(errorMsg);
            }
          }
        }

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            fee,
            netAmount: amount,
            currency,
            type: TransactionType.WITHDRAW,
            status: txStatus,
            blockchainTx: blockchainTxHash,
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description:
              description ||
              `Retrait ${currency} vers adresse externe: ${recipientInput.slice(0, 8)}...${recipientInput.slice(-6)}`,
            metadata: {
              externalAddress: recipientInput,
              network: currency,
              isBlockchainWithdraw: true,
              executedAt: blockchainTxHash ? new Date().toISOString() : null,
            },
          },
        });

        // Update global stats
        await tx.systemConfig
          .update({
            where: { id: "GLOBAL_CONFIG" },
            data: { totalProfit: { increment: fee } },
          })
          .catch(() => {});

        return { type: "EXTERNAL" as const, transaction, blockchainTxHash };
      },
      { maxWait: 5000, timeout: 20000 }
    );

    const isBlockchainSuccess = result.type === "EXTERNAL" && result.transaction.status === "SUCCESS";
    
    return NextResponse.json({
      success: true,
      mode: result.type,
      message:
        result.type === "INTERNAL"
          ? "Transfert interne reussi"
          : isBlockchainSuccess 
            ? "Transfert blockchain execute avec succes"
            : "Retrait externe enregistre (en attente de traitement)",
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        amount: result.transaction.amount,
        fee: result.transaction.fee,
        currency: result.transaction.currency,
        status: result.transaction.status,
        type: result.transaction.type,
        blockchainTx: result.transaction.blockchainTx || null,
      },
    });
  } catch (error: any) {
    console.error("[USER_TRANSFER_ERROR]:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert" },
      { status: 400 }
    );
  }
}
