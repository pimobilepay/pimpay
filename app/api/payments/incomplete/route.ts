export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, WalletType, TransactionType } from "@prisma/client";

const PI_API_KEY = () => process.env.PI_API_KEY;

// ── Helper: Get payment details from Pi Network ──────────────────────────────
async function getPiPaymentDetails(paymentId: string) {
  const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Key ${PI_API_KEY()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Helper: Try to approve a payment ─────────────────────────────────────────
async function approvePayment(paymentId: string) {
  const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Key ${PI_API_KEY()}`,
      "Content-Type": "application/json",
    },
  });
  return res;
}

// ── Helper: Try to complete a payment ────────────────────────────────────────
async function completePayment(paymentId: string, txid: string) {
  const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Key ${PI_API_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txid }),
  });
  return res;
}

// ── Helper: Try to cancel a payment ──────────────────────────────────────────
async function cancelPayment(paymentId: string) {
  const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Key ${PI_API_KEY()}`,
      "Content-Type": "application/json",
    },
  });
  return res;
}

// ── POST: Handle a single incomplete payment from the client SDK callback ────
export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId manquant" }, { status: 400 });
    }

    console.log(`[PIMPAY] Traitement paiement incomplet: ${paymentId}, txid: ${txid || "aucun"}`);

    // 1. Get payment status from Pi Network
    const piPayment = await getPiPaymentDetails(paymentId);

    if (!piPayment) {
      // Payment not found on Pi side - try cancelling to unblock
      console.warn(`[PIMPAY] Paiement ${paymentId} introuvable sur Pi Network. Tentative d'annulation...`);
      await cancelPayment(paymentId);
      return NextResponse.json({ success: true, action: "cancelled", message: "Paiement introuvable, annulation envoyee" });
    }

    const piStatus = piPayment.status?.transaction;
    const piTxid = txid || piPayment.transaction?.txid;
    const piAmount = piPayment.amount;
    const piUserId = piPayment.metadata?.userId;

    console.log(`[PIMPAY] Pi payment status: ${JSON.stringify(piPayment.status)}, txid: ${piTxid}`);

    // ── CASE A: Payment already completed on Pi side ─────────────────────────
    // The blockchain transaction exists. We need to complete it on our side too.
    if (piTxid && (piStatus === "completed" || piStatus === "confirmed")) {
      // Already done, just sync our DB
      return await syncCompletedPayment(paymentId, piTxid, piAmount, piUserId);
    }

    // ── CASE B: Payment has a blockchain txid but server hasn't completed it ──
    // The user signed but our /complete was never called (app crashed, network error, etc.)
    if (piTxid) {
      console.log(`[PIMPAY] Tentative de completion S2S pour ${paymentId}`);

      const completeRes = await completePayment(paymentId, piTxid);
      const completeData = await completeRes.json().catch(() => ({}));

      if (completeRes.ok || completeData.message === "Payment already completed") {
        return await syncCompletedPayment(paymentId, piTxid, piAmount, piUserId);
      }
    }

    // ── CASE C: Payment was approved but user never signed (no txid) ─────────
    // The user saw the Pi payment dialog but never confirmed. We must cancel it.
    if (!piTxid) {
      // First try to approve (in case it's stuck in "created" state)
      const serverApproved = piPayment.status?.developer_approved;
      
      if (!serverApproved) {
        console.log(`[PIMPAY] Paiement ${paymentId} non approuve. Approbation puis annulation...`);
        await approvePayment(paymentId);
      }

      // Now cancel it to free up the user
      console.log(`[PIMPAY] Annulation du paiement ${paymentId} (pas de txid)`);
      const cancelRes = await cancelPayment(paymentId);
      const cancelData = await cancelRes.json().catch(() => ({}));

      if (cancelRes.ok || cancelData.message?.includes("already")) {
        // Mark as FAILED in our DB if it exists
        await prisma.transaction.updateMany({
          where: { externalId: paymentId },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              cancelledAt: new Date().toISOString(),
              reason: "incomplete_auto_cancel",
            },
          },
        });

        return NextResponse.json({
          success: true,
          action: "cancelled",
          message: "Paiement annule avec succes. Vous pouvez relancer une transaction.",
        });
      }

      // If cancel also fails, return the error but don't crash
      console.error(`[PIMPAY] Echec annulation ${paymentId}:`, cancelData);
      return NextResponse.json({
        success: false,
        action: "cancel_failed",
        message: "Impossible d'annuler le paiement. Veuillez reessayer.",
        details: cancelData,
      }, { status: 500 });
    }

    return NextResponse.json({ success: false, message: "Etat du paiement non gere" }, { status: 400 });

  } catch (error: any) {
    console.error("[INCOMPLETE_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Sync a completed payment into our database ──────────────────────────────
async function syncCompletedPayment(
  paymentId: string,
  txid: string,
  amount: number,
  userId: string | null
) {
  // Find existing transaction in our DB
  const existingTx = await prisma.transaction.findUnique({
    where: { externalId: paymentId },
  });

  const finalUserId = existingTx?.toUserId || userId;
  const finalAmount = existingTx?.amount || amount;

  if (!finalUserId) {
    console.error(`[PIMPAY] Impossible de crediter: userId introuvable pour ${paymentId}`);
    return NextResponse.json({
      success: true,
      action: "completed_no_user",
      message: "Paiement complete sur Pi Network mais utilisateur introuvable dans PimPay",
    });
  }

  // Don't double-credit
  if (existingTx?.status === TransactionStatus.SUCCESS) {
    return NextResponse.json({
      success: true,
      action: "already_completed",
      message: "Ce paiement a deja ete credite.",
    });
  }

  // Atomic DB update
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId_currency: { userId: finalUserId, currency: "PI" } },
      update: { balance: { increment: finalAmount } },
      create: {
        userId: finalUserId,
        currency: "PI",
        balance: finalAmount,
        type: WalletType.PI,
      },
    });

    const updatedTx = await tx.transaction.upsert({
      where: { externalId: paymentId },
      update: {
        status: TransactionStatus.SUCCESS,
        blockchainTx: txid,
        toWalletId: wallet.id,
        metadata: {
          recoveredAt: new Date().toISOString(),
          method: "INCOMPLETE_AUTO_RECOVERY",
        },
      },
      create: {
        reference: `REC-${paymentId.slice(-6).toUpperCase()}`,
        externalId: paymentId,
        blockchainTx: txid,
        amount: finalAmount,
        currency: "PI",
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.SUCCESS,
        toUserId: finalUserId,
        toWalletId: wallet.id,
        description: "Depot recupere automatiquement",
      },
    });

    return updatedTx;
  }, { timeout: 10000 });

  console.log(`[PIMPAY] Paiement ${paymentId} recupere et credite: ${finalAmount} PI`);

  return NextResponse.json({
    success: true,
    action: "completed",
    message: `Depot de ${finalAmount} Pi credite avec succes !`,
    transaction: result,
  });
}

// ── GET: Batch recover all incomplete payments from Pi Network ────────────────
export async function GET() {
  try {
    const apiKey = PI_API_KEY();
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API Pi manquante" }, { status: 500 });
    }

    // 1. Fetch incomplete payments from Pi Network
    const piRes = await fetch("https://api.minepi.com/v2/payments/incomplete", {
      headers: { Authorization: `Key ${apiKey}` },
    });

    const data = await piRes.json();
    const incompletePayments = data.incomplete_payments || [];

    if (incompletePayments.length === 0) {
      return NextResponse.json({ message: "Aucun paiement bloque trouve.", count: 0 });
    }

    const results = [];

    // 2. Process each incomplete payment
    for (const payment of incompletePayments) {
      const paymentId = payment.identifier;
      const txid = payment.transaction?.txid;
      const serverApproved = payment.status?.developer_approved;

      try {
        if (txid) {
          // Has txid -> try to complete
          const completeRes = await completePayment(paymentId, txid);
          if (completeRes.ok) {
            await prisma.transaction.updateMany({
              where: { externalId: paymentId },
              data: {
                status: "SUCCESS",
                blockchainTx: txid,
                metadata: { recoveredAt: new Date().toISOString(), method: "BATCH_RECOVERY" },
              },
            });
            results.push({ id: paymentId, action: "completed" });
          } else {
            results.push({ id: paymentId, action: "complete_failed" });
          }
        } else {
          // No txid -> approve if needed, then cancel
          if (!serverApproved) {
            await approvePayment(paymentId);
          }
          const cancelRes = await cancelPayment(paymentId);
          if (cancelRes.ok) {
            await prisma.transaction.updateMany({
              where: { externalId: paymentId },
              data: {
                status: "FAILED",
                metadata: { cancelledAt: new Date().toISOString(), reason: "batch_auto_cancel" },
              },
            });
            results.push({ id: paymentId, action: "cancelled" });
          } else {
            results.push({ id: paymentId, action: "cancel_failed" });
          }
        }
      } catch (err: any) {
        results.push({ id: paymentId, action: "error", error: err.message });
      }
    }

    return NextResponse.json({
      message: `${results.length} paiements traites`,
      details: results,
    });

  } catch (error: any) {
    console.error("[BATCH_RECOVERY_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
