export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ CONFIGURATION
    const JWT_SECRET = process.env.JWT_SECRET;
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!JWT_SECRET || !PI_API_KEY) {
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // 2. AUTHENTIFICATION (Standard PimPay)
    const token = cookies().get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // 3. VALIDATION INPUT
    const body = await req.json().catch(() => ({}));
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données de transaction manquantes" }, { status: 400 });
    }

    // 4. PROTECTION ANTI-REJEU (Idempotence)
    const existingTx = await prisma.transaction.findUnique({
      where: { reference: paymentId }
    });
    if (existingTx) {
      return NextResponse.json({ success: true, message: "Déjà traité" }, { status: 200 });
    }

    // 5. NOTIFIER PI NETWORK (Server-to-Server)
    const piCompleteResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid }),
    });

    if (!piCompleteResponse.ok) {
      return NextResponse.json({ error: "Validation Pi Network échouée" }, { status: 400 });
    }

    // 6. VÉRIFICATION DU MONTANT (Source de vérité Pi)
    const paymentDetailsResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: "GET",
      headers: { "Authorization": `Key ${PI_API_KEY}` }
    });

    if (!paymentDetailsResponse.ok) throw new Error("Vérification Pi impossible");
    const paymentData = await paymentDetailsResponse.json();
    const amount = Number(paymentData.amount);

    // 7. TRANSACTION ATOMIQUE PRISMA (Respect du schéma Finance)
    const result = await prisma.$transaction(async (tx) => {
      // Upsert du Wallet (Essentiel pour PimPay)
      const wallet = await tx.wallet.upsert({
        where: {
          userId_currency: { userId, currency: "PI" }
        },
        update: {
          balance: { increment: amount }
        },
        create: {
          userId,
          currency: "PI",
          balance: amount,
          type: "PI"
        }
      });

      // Création du log de transaction (avec les IDs de wallet pour ton schéma)
      await tx.transaction.create({
        data: {
          reference: paymentId,
          amount: amount,
          type: "DEPOSIT",
          status: "COMPLETED",
          toUserId: userId,      // On remplit toUserId pour un dépôt
          toWalletId: wallet.id, // Lien direct avec le wallet crédité
          currency: "PI",
          description: `Dépôt via Pi Network (TX: ${txid.substring(0, 8)}...)`,
          metadata: { txid, paymentId, method: "PI_SDK" }
        }
      });

      // Optionnel : Mise à jour des stats globales PimPay
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { totalVolumePi: { increment: amount } }
      });

      return wallet;
    });

    return NextResponse.json({
      success: true,
      newBalance: result.balance
    });

  } catch (error: any) {
    console.error("PAYMENT_COMPLETE_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la validation finale" }, { status: 500 });
  }
}
