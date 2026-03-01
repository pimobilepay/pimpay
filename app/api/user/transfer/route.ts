export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";

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

    // ── 3. FEE from SystemConfig ────────────────────────────────────────────
    const config = await prisma.systemConfig
      .findUnique({ where: { id: "GLOBAL_CONFIG" } })
      .catch(() => null);

    const feeRate = config?.transactionFee ?? 0.01;
    const fee = Math.round(amount * feeRate * 100) / 100; // percentage-based fee
    const totalDebit = amount + fee;

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

        // Create PENDING withdraw transaction
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            fee,
            netAmount: amount,
            currency,
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.PENDING,
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description:
              description ||
              `Retrait ${currency} vers adresse externe: ${recipientInput.slice(0, 8)}...${recipientInput.slice(-6)}`,
            metadata: {
              externalAddress: recipientInput,
              network: currency,
              isBlockchainWithdraw: true,
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

        return { type: "EXTERNAL" as const, transaction };
      },
      { maxWait: 5000, timeout: 20000 }
    );

    return NextResponse.json({
      success: true,
      mode: result.type,
      message:
        result.type === "INTERNAL"
          ? "Transfert interne reussi"
          : "Retrait externe enregistre (en attente de traitement)",
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        amount: result.transaction.amount,
        fee: result.transaction.fee,
        currency: result.transaction.currency,
        status: result.transaction.status,
        type: result.transaction.type,
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
