import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId requis" }, { status: 400 });
    }

    const PI_API_KEY = process.env.PI_API_KEY;

    // Step 1: Try to approve first (required before cancel if not yet approved)
    await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }).catch(() => {});

    // Step 2: Cancel the payment on Pi Network
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Step 3: Mark as FAILED in our DB
    await prisma.transaction.updateMany({
      where: { externalId: paymentId },
      data: {
        status: "FAILED",
        metadata: {
          forceCancelledAt: new Date().toISOString(),
          reason: "admin_force_cancel",
        },
      },
    });

    if (response.ok || data.message?.includes("already")) {
      return NextResponse.json({
        success: true,
        message: "Paiement annule avec succes. L'utilisateur peut relancer une transaction.",
      });
    } else {
      return NextResponse.json({ success: false, error: data }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Keep GET for quick one-off cancels via browser (fetches all incomplete and cancels)
export async function GET() {
  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    // Get all incomplete payments
    const piRes = await fetch("https://api.minepi.com/v2/payments/incomplete", {
      headers: { Authorization: `Key ${PI_API_KEY}` },
    });

    const piData = await piRes.json();
    const payments = piData.incomplete_payments || [];

    if (payments.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun paiement bloque.", count: 0 });
    }

    const results = [];

    for (const payment of payments) {
      const pid = payment.identifier;
      const hasTxid = !!payment.transaction?.txid;

      // Approve first (needed before cancel)
      await fetch(`https://api.minepi.com/v2/payments/${pid}/approve`, {
        method: "POST",
        headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
      }).catch(() => {});

      if (!hasTxid) {
        // No blockchain tx -> cancel
        const cancelRes = await fetch(`https://api.minepi.com/v2/payments/${pid}/cancel`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
        });
        results.push({ id: pid, action: cancelRes.ok ? "cancelled" : "cancel_failed" });
      } else {
        // Has txid -> complete it
        const completeRes = await fetch(`https://api.minepi.com/v2/payments/${pid}/complete`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ txid: payment.transaction.txid }),
        });
        results.push({ id: pid, action: completeRes.ok ? "completed" : "complete_failed" });
      }

      // Update DB
      await prisma.transaction.updateMany({
        where: { externalId: pid },
        data: {
          status: hasTxid ? "SUCCESS" : "FAILED",
          metadata: { resolvedAt: new Date().toISOString(), method: "admin_force_resolve" },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} paiements traites`,
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
