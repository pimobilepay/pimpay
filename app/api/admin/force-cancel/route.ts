import { NextRequest, NextResponse } from "next/server";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { cancelPiPayment, getPiPayment } from "@/lib/pi";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });

  let body: { paymentId?: string; reference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const identifier = typeof body.paymentId === "string" ? body.paymentId.trim() :
    typeof body.reference === "string" ? body.reference.trim() : "";
  if (!identifier || identifier.length > 256) {
    return NextResponse.json({ error: "Identifiant de paiement requis" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      currency: "PI",
      OR: [{ externalId: identifier }, { reference: identifier }],
    },
  });
  if (!transaction?.externalId) {
    return NextResponse.json({ error: "Transaction Pi avec paymentId enregistré introuvable" }, { status: 404 });
  }
  if (transaction.status !== TransactionStatus.PENDING) {
    return NextResponse.json({ error: "Seules les transactions Pi en attente peuvent être annulées" }, { status: 409 });
  }

  const payment = await getPiPayment(transaction.externalId);
  if (!payment || payment.identifier !== transaction.externalId) {
    return NextResponse.json({ error: "Paiement introuvable chez Pi" }, { status: 404 });
  }
  if (payment.transaction?.txid || payment.status?.transaction_verified || payment.transaction?.verified) {
    return NextResponse.json({ error: "Paiement signé ou confirmé: annulation refusée" }, { status: 409 });
  }

  const alreadyCancelled = Boolean(payment.status?.cancelled);
  const cancelled = alreadyCancelled || await cancelPiPayment(transaction.externalId);
  if (!cancelled) return NextResponse.json({ error: "Pi n'a pas confirmé l'annulation" }, { status: 409 });

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.transaction.updateMany({
      where: { id: transaction.id, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.FAILED },
    });
    if (claim.count !== 1) return false;

    const metadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
      ? transaction.metadata as Record<string, unknown>
      : {};
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: { ...metadata, forceCancelledAt: new Date().toISOString(), reason: "admin_force_cancel" },
      },
    });

    if (transaction.type === TransactionType.WITHDRAW) {
      if (!transaction.fromWalletId) throw new Error("Wallet de remboursement introuvable");
      await tx.wallet.update({
        where: { id: transaction.fromWalletId },
        data: { balance: { increment: transaction.amount + transaction.fee } },
      });
    }
    return true;
  });

  if (!result) return NextResponse.json({ error: "La transaction a déjà changé d'état" }, { status: 409 });
  return NextResponse.json({ success: true, message: "Paiement Pi non signé annulé; solde restauré si nécessaire." });
}

export async function GET() {
  return NextResponse.json(
    { error: "Le traitement global des paiements Pi est désactivé. Annulez une transaction précise via POST." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
