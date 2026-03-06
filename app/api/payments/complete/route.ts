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
      return NextResponse.json({ error: "Données incomplètes (paymentId et txid requis)" }, { status: 400 });
    }

    // --- 2. VALIDATION PI NETWORK (S2S) ---
    // IMPORTANT: On appelle /complete pour finaliser le paiement sur Pi Network
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const piData = await piRes.json();
    const isAlreadyCompleted = piData.message === "Payment already completed";
    
    if (!piRes.ok && !isAlreadyCompleted) {
      console.error("Pi Network Complete Error:", piData);
      // NE PAS créditer si Pi Network refuse
      return NextResponse.json({ 
        error: "Pi Network n'a pas pu valider ce paiement",
        details: piData.message || "Transaction non confirmée sur la blockchain"
      }, { status: 403 });
    }

    // --- 3. VÉRIFICATION DU PAIEMENT AUPRÈS DE PI NETWORK ---
    // On vérifie que le paiement existe vraiment et est complété
    const verifyRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
      },
    });

    const paymentDetails = await verifyRes.json().catch(() => ({}));
    
    // Vérifier que la transaction blockchain est confirmée
    if (!isAlreadyCompleted && paymentDetails.status?.transaction_verified !== true) {
      console.error("Transaction Pi non vérifiée:", paymentDetails.status);
      return NextResponse.json({ 
        error: "La transaction n'est pas encore confirmée sur la blockchain Pi",
        status: paymentDetails.status
      }, { status: 403 });
    }

    // Utiliser le montant vérifié par Pi Network
    const verifiedAmount = parseFloat(paymentDetails.amount || piData.amount || 0);
    
    if (verifiedAmount <= 0) {
      return NextResponse.json({ 
        error: "Montant invalide ou non vérifié par Pi Network" 
      }, { status: 400 });
    }

    // --- 4. VÉRIFICATION ANTI-DOUBLON ---
    const existingSuccessTx = await prisma.transaction.findFirst({
      where: {
        OR: [
          { externalId: paymentId },
          { blockchainTx: txid }
        ],
        status: TransactionStatus.SUCCESS
      }
    });

    if (existingSuccessTx) {
      return NextResponse.json({ 
        success: true, 
        message: "Transaction déjà créditée",
        amount: existingSuccessTx.amount 
      });
    }

    // --- 5. MISE À JOUR BANCAIRE ATOMIQUE ---
    const finalResult = await prisma.$transaction(async (tx) => {
      // Chercher une transaction PENDING existante
      let transaction = await tx.transaction.findFirst({
        where: { externalId: paymentId }
      });

      // Si aucune transaction existe, en créer une nouvelle
      if (!transaction) {
        transaction = await tx.transaction.create({
          data: {
            reference: `PI-${paymentId.slice(-8).toUpperCase()}`,
            externalId: paymentId,
            blockchainTx: txid,
            amount: verifiedAmount,
            currency: "PI",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.PENDING,
            toUserId: userId,
            description: "Dépôt Pi Network (vérifié)",
            metadata: {
              piVerified: true,
              verifiedAmount: verifiedAmount
            }
          }
        });
      }

      // Wallet upsert avec crédit du montant vérifié
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: verifiedAmount } },
        create: {
          userId,
          currency: "PI",
          balance: verifiedAmount,
          type: WalletType.PI
        }
      });

      // Mise à jour de la transaction en SUCCESS
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          amount: verifiedAmount, // S'assurer que le montant est celui vérifié
          metadata: {
            completedAt: new Date().toISOString(),
            piNetworkVerified: true,
            blockchainConfirmed: true
          }
        }
      });

      // Notification de succès
      await tx.notification.create({
        data: {
          userId,
          title: "Dépôt Pi confirmé",
          message: `Votre compte a été crédité de ${verifiedAmount} PI.`,
          type: "SUCCESS"
        }
      });

      return updatedTx;
    }, { maxWait: 10000, timeout: 30000 });
  
    console.log(`[PIMPAY] Portefeuille credite : ${verifiedAmount} PI pour ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Dépôt Pi confirmé et crédité !",
      amount: verifiedAmount,
      transaction: finalResult
    });

  } catch (error: any) {
    console.error("[CRITICAL_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
