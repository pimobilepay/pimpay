export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { cancelPiPayment, completePiPayment, getPiNetwork, getPiPayment } from "@/lib/pi";

function belongsToUser(
  payment: NonNullable<Awaited<ReturnType<typeof getPiPayment>>>,
  _userId: string,
  piUserId: string | null
) {
  return Boolean(payment.user_uid && piUserId && payment.user_uid === piUserId);
}

function isVerified(payment: NonNullable<Awaited<ReturnType<typeof getPiPayment>>>) {
  return payment.status?.transaction_verified === true || payment.transaction?.verified === true;
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

    let body: { paymentId?: string; txid?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const submittedTxid = typeof body.txid === "string" ? body.txid.trim() : "";
    if (!paymentId || paymentId.length > 256) {
      return NextResponse.json({ error: "paymentId invalide" }, { status: 400 });
    }

    const [transaction, user, payment] = await Promise.all([
      prisma.transaction.findUnique({ where: { externalId: paymentId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { piUserId: true } }),
      getPiPayment(paymentId),
    ]);

    if (!transaction || transaction.toUserId !== userId || transaction.type !== TransactionType.DEPOSIT || transaction.currency !== "PI") {
      return NextResponse.json({ error: "Paiement en attente introuvable pour cet utilisateur" }, { status: 404 });
    }
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, action: "already_completed" });
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: "Ce paiement n'est plus en attente" }, { status: 409 });
    }
    if (!payment || payment.identifier !== paymentId) {
      return NextResponse.json({ error: "Paiement Pi introuvable; aucune annulation automatique effectuée" }, { status: 404 });
    }
    if (!belongsToUser(payment, userId, user?.piUserId ?? null)) {
      return NextResponse.json({ error: "Le paiement Pi n'appartient pas à cet utilisateur" }, { status: 403 });
    }
    const network = await getPiNetwork();
    const transactionMetadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
      ? transaction.metadata as Record<string, unknown>
      : {};
    if (
      (typeof transactionMetadata.network === "string" && transactionMetadata.network !== network) ||
      (payment.metadata?.network && payment.metadata.network !== network)
    ) {
      return NextResponse.json({ error: "Ce paiement appartient à un autre réseau Pi" }, { status: 409 });
    }

    const txid = submittedTxid || payment.transaction?.txid || "";
    const verified = isVerified(payment);

    if (!txid) {
      if (verified || payment.transaction?.txid) {
        return NextResponse.json({ error: "Paiement déjà signé: annulation refusée" }, { status: 409 });
      }
      const cancelled = await cancelPiPayment(paymentId);
      if (!cancelled) return NextResponse.json({ error: "Pi n'a pas confirmé l'annulation" }, { status: 409 });

      const update = await prisma.transaction.updateMany({
        where: { id: transaction.id, toUserId: userId, status: TransactionStatus.PENDING },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transactionMetadata,
            network,
            cancelledAt: new Date().toISOString(),
            reason: "user_incomplete_payment",
          },
        },
      });

      if (update.count !== 1) {
        const latest = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        if (latest?.status === TransactionStatus.SUCCESS && latest.toUserId === userId) {
          return NextResponse.json({ success: true, action: "already_completed" });
        }
        return NextResponse.json({ error: "Le paiement a changé d'état; aucune autre action effectuée" }, { status: 409 });
      }

      return NextResponse.json({ success: true, action: "cancelled", network });
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount - transaction.amount) > 1e-7) {
      return NextResponse.json({ error: "Le montant Pi ne correspond pas au dépôt en attente" }, { status: 409 });
    }
    if (payment.transaction?.txid && payment.transaction.txid !== txid) {
      return NextResponse.json({ error: "Le txid ne correspond pas au paiement Pi" }, { status: 403 });
    }

    if (!verified) {
      const completion = await completePiPayment(paymentId, txid);
      if (!completion.ok) return NextResponse.json({ error: "Pi n'a pas confirmé la transaction", retryable: true }, { status: 409 });
    }

    const confirmedPayment = await getPiPayment(paymentId);
    if (
      !confirmedPayment ||
      !belongsToUser(confirmedPayment, userId, user?.piUserId ?? null) ||
      !isVerified(confirmedPayment) ||
      (confirmedPayment.metadata?.network && confirmedPayment.metadata.network !== network)
    ) {
      return NextResponse.json({ error: "Paiement non confirmé sur le réseau Pi actif", retryable: true }, { status: 409 });
    }
    if (confirmedPayment.transaction?.txid && confirmedPayment.transaction.txid !== txid) {
      return NextResponse.json({ error: "Le txid confirmé ne correspond pas" }, { status: 403 });
    }

    const settled = await prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: {
          id: transaction.id,
          toUserId: userId,
          type: TransactionType.DEPOSIT,
          currency: "PI",
          status: TransactionStatus.PENDING,
        },
        data: { status: TransactionStatus.SUCCESS, amount, blockchainTx: txid },
      });
      if (claim.count !== 1) return false;

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: amount } },
        create: { userId, currency: "PI", balance: amount, type: WalletType.PI },
      });
      const metadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
        ? transaction.metadata as Record<string, unknown>
        : {};
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          toWalletId: wallet.id,
          metadata: { ...metadata, network, verifiedAmount: amount, recoveredAt: new Date().toISOString() },
        },
      });
      return true;
    }, { maxWait: 10000, timeout: 30000 });

    if (!settled) {
      const latest = await prisma.transaction.findUnique({ where: { id: transaction.id } });
      if (latest?.status === TransactionStatus.SUCCESS && latest.toUserId === userId) {
        return NextResponse.json({ success: true, action: "already_completed", amount: latest.amount, network });
      }
      return NextResponse.json({ error: "Le paiement a changé d'état; réessayez après vérification" }, { status: 409 });
    }

    return NextResponse.json({ success: true, action: "completed", amount, network });
  } catch (error) {
    console.error("[PIMPAY] Erreur paiement incomplet Pi:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du paiement" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "La récupération globale des paiements est désactivée. Utilisez le callback Pi authentifié." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
