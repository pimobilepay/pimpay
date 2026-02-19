export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!PI_API_KEY) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    // 1. Demander à Pi Network les paiements restés en suspend (Incomplete)
    const piRes = await fetch("https://api.minepi.com/v2/payments/incomplete", {
      headers: { "Authorization": `Key ${PI_API_KEY}` },
    });

    const data = await piRes.json();
    const incompletePayments = data.incomplete_payments || [];

    if (incompletePayments.length === 0) {
      return NextResponse.json({ message: "Aucun paiement bloqué trouvé." });
    }

    const results = [];

    // 2. Boucler sur chaque paiement pour le finaliser
    for (const payment of incompletePayments) {
      const paymentId = payment.identifier;
      const txid = payment.transaction?.txid;

      // On tente de finaliser auprès de Pi
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      if (completeRes.ok) {
        // 3. Si Pi valide, on met à jour notre base PimPay en "SUCCESS"
        await prisma.transaction.updateMany({
          where: { externalId: paymentId },
          data: { 
            status: "SUCCESS",
            blockchainTx: txid,
            metadata: { recoveredAt: new Date().toISOString() }
          }
        });
        results.push({ id: paymentId, status: "Fixed" });
      } else {
        results.push({ id: paymentId, status: "Failed to complete" });
      }
    }

    return NextResponse.json({
      message: `${results.length} paiements traités`,
      details: results
    });

  } catch (error: any) {
    console.error("❌ Recovery Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
