export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { completePiPayment, getPiNetwork, getPiPayment } from "@/lib/pi";

function isPiUser(payment: Awaited<ReturnType<typeof getPiPayment>>, _userId: string, piUserId: string | null) {
  return Boolean(payment?.user_uid && piUserId && payment.user_uid === piUserId);
}

function isVerified(payment: NonNullable<Awaited<ReturnType<typeof getPiPayment>>>) {
  return payment.status?.transaction_verified === true || payment.transaction?.verified === true;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });

    let body: { paymentId?: string; txid?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const txid = typeof body.txid === "string" ? body.txid.trim() : "";
    if (!paymentId || paymentId.length > 256 || !txid || txid.length > 256) {
      return NextResponse.json({ error: "paymentId ou txid invalide" }, { status: 400 });
    }

    const [transaction, user] = await Promise.all([
      prisma.transaction.findUnique({ where: { externalId: paymentId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { piUserId: true } }),
    ]);

    if (!transaction || transaction.toUserId !== userId || transaction.type !== TransactionType.DEPOSIT || transaction.currency !== "PI") {
      return NextResponse.json({ error: "Dépôt Pi introuvable pour cet utilisateur" }, { status: 404 });
    }
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, alreadyCredited: true, amount: transaction.amount });
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: "Ce dépôt n'est plus en attente" }, { status: 409 });
    }

    const network = await getPiNetwork();
    const transactionMetadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
      ? transaction.metadata as Record<string, unknown>
      : {};
    if (typeof transactionMetadata.network === "string" && transactionMetadata.network !== network) {
      return NextResponse.json({ error: "Le dépôt est enregistré sur un autre réseau Pi" }, { status: 409 });
    }

    let payment = await getPiPayment(paymentId);
    if (!payment || payment.identifier !== paymentId) {
      return NextResponse.json({ error: "Paiement Pi introuvable" }, { status: 404 });
    }
    if (payment.metadata?.network && payment.metadata.network !== network) {
      return NextResponse.json({ error: "Le paiement Pi appartient à un autre réseau" }, { status: 409 });
    }
    if (!isPiUser(payment, userId, user?.piUserId ?? null)) {
      return NextResponse.json({ error: "Le paiement Pi n'appartient pas à cet utilisateur" }, { status: 403 });
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount - transaction.amount) > 1e-7) {
      return NextResponse.json({ error: "Le montant Pi ne correspond pas au dépôt en attente" }, { status: 409 });
    }

    const storedTxid = payment.transaction?.txid;
    if (storedTxid && storedTxid !== txid) {
      return NextResponse.json({ error: "Le txid ne correspond pas au paiement Pi" }, { status: 403 });
    }

    if (!isVerified(payment)) {
      const completion = await completePiPayment(paymentId, txid);
      if (!completion.ok) {
        return NextResponse.json({ error: "Pi n'a pas confirmé la transaction", retryable: true }, { status: 409 });
      }
      payment = await getPiPayment(paymentId);
    }

    if (
      !payment ||
      !isPiUser(payment, userId, user?.piUserId ?? null) ||
      !isVerified(payment) ||
      (payment.metadata?.network && payment.metadata.network !== network)
    ) {
      return NextResponse.json({ error: "Paiement non vérifié sur le réseau Pi actif", retryable: true }, { status: 409 });
    }
    if (payment.transaction?.txid && payment.transaction.txid !== txid) {
      return NextResponse.json({ error: "Le txid confirmé ne correspond pas" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.transaction.updateMany({
        where: {
          id: transaction.id,
          toUserId: userId,
          type: TransactionType.DEPOSIT,
          currency: "PI",
          status: TransactionStatus.PENDING,
        },
        data: { status: TransactionStatus.SUCCESS, amount, blockchainTx: txid },
      });

      if (claimed.count !== 1) return { credited: false, wallet: null };

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: amount } },
        create: { userId, currency: "PI", balance: amount, type: WalletType.PI },
      });

      const previousMetadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
        ? transaction.metadata as Record<string, unknown>
        : {};

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          toWalletId: wallet.id,
          metadata: { ...previousMetadata, network, verifiedAmount: amount, completedAt: new Date().toISOString() },
        },
      });

      return { credited: true, wallet };
    }, { maxWait: 10000, timeout: 30000 });

    if (!result.credited) {
      const latest = await prisma.transaction.findUnique({ where: { id: transaction.id } });
      if (latest?.status === TransactionStatus.SUCCESS && latest.toUserId === userId) {
        return NextResponse.json({ success: true, alreadyCredited: true, amount: latest.amount });
      }
      return NextResponse.json({ error: "Le dépôt a déjà été traité ou a changé d'état" }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Dépôt Pi confirmé", amount, network });
  } catch (error) {
    console.error("[PIMPAY] Erreur de complétion Pi:", error);
    return NextResponse.json({ error: "Erreur de traitement du paiement" }, { status: 500 });
  }
}
