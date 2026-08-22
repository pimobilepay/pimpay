export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/doge/transfer
 *
 * Diffuse réellement un retrait DOGE sur la blockchain Dogecoin.
 * Débite d'abord le wallet interne (montant + frais PIMOBIPAY), tente le
 * broadcast on-chain, puis rembourse automatiquement en cas d'échec — même
 * logique que les autres retraits crypto de l'app.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { isValidDogeAddress, sendDoge } from "@/lib/blockchain/dogecoin";
import { getFeeConfig, calculateFee } from "@/lib/fees";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const toAddress = typeof body?.toAddress === "string" ? body.toAddress.trim() : "";
    const amount = Number(body?.amount);
    const pin = typeof body?.pin === "string" ? body.pin : "";

    if (!toAddress || !isValidDogeAddress(toAddress)) {
      return NextResponse.json({ error: "Adresse DOGE de destination invalide" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const [user, feeConfig] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { pin: true, dogeAddress: true, dogePrivateKey: true },
      }),
      getFeeConfig(),
    ]);

    if (!user?.pin) {
      return NextResponse.json({ error: "Sécurité non configurée" }, { status: 403 });
    }
    if (!pin || !(await bcrypt.compare(pin, user.pin))) {
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }
    if (!user.dogeAddress || !user.dogePrivateKey) {
      return NextResponse.json(
        { error: "Aucun portefeuille DOGE configuré. Synchronisez votre wallet d'abord." },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "DOGE" } },
    });

    const { feeAmount, totalDebit } = calculateFee(amount, feeConfig, "withdraw");
    if (!wallet || wallet.balance < totalDebit) {
      return NextResponse.json(
        { error: `Solde DOGE insuffisant. Requis: ${totalDebit.toFixed(6)} DOGE` },
        { status: 400 }
      );
    }

    const txRef = `PP-DOGE-W-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // 1. Débit immédiat + transaction PENDING (atomique).
    const pending = await prisma.$transaction(async (tx) => {
      const fresh = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!fresh || fresh.balance < totalDebit) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      const updated = await tx.wallet.update({
        where: { id: fresh.id },
        data: { balance: { decrement: totalDebit } },
      });
      const withdrawTx = await tx.transaction.create({
        data: {
          reference: txRef,
          amount,
          fee: feeAmount,
          netAmount: amount,
          currency: "DOGE",
          type: "WITHDRAW",
          status: "PENDING",
          fromUserId: userId,
          fromWalletId: fresh.id,
          description: `Retrait DOGE vers ${toAddress.substring(0, 10)}...`,
          accountNumber: toAddress,
          metadata: {
            destination: toAddress,
            externalAddress: toAddress,
            isBlockchainWithdraw: true,
            network: "DOGE",
          },
        },
      });
      return { updated, withdrawTx };
    }, { maxWait: 10000, timeout: 30000 });

    // 2. Diffusion réelle on-chain (hors transaction Prisma : appel réseau).
    try {
      const privateKeyWIF = decrypt(user.dogePrivateKey);
      const { txid, feeKoinu } = await sendDoge({
        fromAddress: user.dogeAddress,
        privateKeyWIF,
        toAddress,
        amountKoinu: Math.round(amount * 1e8),
      });

      const completed = await prisma.transaction.update({
        where: { id: pending.withdrawTx.id },
        data: {
          status: "SUCCESS",
          blockchainTx: txid,
          statusClass: "BROADCASTED",
          metadata: {
            destination: toAddress,
            externalAddress: toAddress,
            isBlockchainWithdraw: true,
            network: "DOGE",
            networkFeeKoinu: feeKoinu,
            broadcastedAt: new Date().toISOString(),
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: "Retrait DOGE envoyé",
          message: `${amount} DOGE envoyés vers ${toAddress.substring(0, 10)}... (Frais: ${feeAmount} DOGE)`,
          type: "PAYMENT",
          metadata: { txRef, blockchainTx: txid },
        },
      });

      return NextResponse.json({
        success: true,
        txRef,
        blockchainTx: txid,
        newBalance: pending.updated.balance,
        feePaid: feeAmount,
      });
    } catch (broadcastErr: any) {
      // 3. Échec de diffusion → remboursement automatique.
      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: totalDebit } },
        }),
        prisma.transaction.update({
          where: { id: pending.withdrawTx.id },
          data: {
            status: "FAILED",
            statusClass: "FAILED_BROADCAST",
            metadata: {
              destination: toAddress,
              externalAddress: toAddress,
              isBlockchainWithdraw: true,
              network: "DOGE",
              broadcastError: broadcastErr?.message || "Erreur inconnue",
              refunded: true,
            },
          },
        }),
      ]);

      console.error("[DOGE_TRANSFER_BROADCAST_ERROR]:", broadcastErr?.message);
      return NextResponse.json(
        {
          error: `Échec de la diffusion DOGE : ${broadcastErr?.message || "erreur réseau"}. Votre solde a été remboursé.`,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Solde DOGE insuffisant" }, { status: 400 });
    }
    console.error("[DOGE_TRANSFER_FATAL]:", error);
    return NextResponse.json({ error: "Erreur lors du retrait DOGE" }, { status: 500 });
  }
}
