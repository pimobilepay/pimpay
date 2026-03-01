export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, WalletType, TransactionType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // --- 1. AUTHENTIFICATION ---
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { paymentId, txid } = await request.json();
    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // --- 2. VALIDATION PI NETWORK (S2S) ---
    // On valide d'abord avec Pi Network pour obtenir les détails réels du paiement (montant)
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const piData = await piRes.json();
    
    // Si Pi dit que c'est déjà complété, on continue pour synchroniser notre base
    const isAlreadyCompleted = piData.message === "Payment already completed";
    
    if (!piRes.ok && !isAlreadyCompleted) {
      console.error("❌ Pi Network Error:", piData);
      return NextResponse.json({ error: "Échec validation Pi Network" }, { status: 403 });
    }

    // --- 3. RÉCUPÉRATION OU RÉCRÉATION DE LA TRANSACTION ---
    // Correction du crash findUnique : On utilise findUnique mais on gère l'absence
    let transaction = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    // Si la transaction n'existe pas (cas du db-clean-up), on la recrée
    if (!transaction) {
      console.warn(`[PIMPAY] ⚠️ Transaction ${paymentId} absente après cleanup. Récréation...`);
      
      // On récupère le montant depuis piData ou on met une valeur par défaut sécurisée
      const amountFromPi = piData.amount || 0; 

      transaction = await prisma.transaction.create({
        data: {
          reference: `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          externalId: paymentId,
          amount: amountFromPi,
          currency: "PI",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          toUserId: userId,
          description: "Récupération dépôt Pi Network"
        }
      });
    }

    // Sécurité : Éviter le double crédit
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, message: "Déjà crédité" });
    }

    // --- 4. MISE À JOUR BANCAIRE ATOMIQUE ---
    const finalResult = await prisma.$transaction(async (tx) => {
      // Utilisation de upsert pour le Wallet pour éviter tout crash si le wallet PI n'existe pas
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: transaction!.amount } },
        create: {
          userId,
          currency: "PI",
          balance: transaction!.amount,
          type: WalletType.PI
        }
      });

      // Mise à jour de la transaction en SUCCESS
      return await tx.transaction.update({
        where: { id: transaction!.id },
        data: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          metadata: {
            completedAt: new Date().toISOString(),
            recoveredAfterCleanup: true
          }
        }
      });
    }, { maxWait: 10000, timeout: 30000 });
  
    console.log(`[PIMPAY] Portefeuille credite : ${transaction.amount} PI pour ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Solde mis à jour !",
      amount: transaction.amount
    });

  } catch (error: any) {
    console.error("❌ [CRITICAL_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
