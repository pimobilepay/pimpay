export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
// Import des Enums pour garantir la compatibilité avec ton schéma
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { paymentId, amount, memo, txid } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // Validation des données requises
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId requis" }, { status: 400 });
    }

    // 1. AUTHENTIFICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. APPROBATION S2S (Server-to-Server) avec Pi Network
    // IMPORTANT: On ne crée PAS de transaction si Pi Network refuse
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
    });

    const approveData = await approveRes.json().catch(() => ({}));
    const isAlreadyApproved = approveData.message === "Payment already approved";

    if (!approveRes.ok && !isAlreadyApproved) {
      console.error("Pi Network refuse l'approbation:", approveData);
      // NE PAS créer de transaction si Pi Network refuse
      return NextResponse.json({ 
        error: "Pi Network a refusé le paiement. Aucune transaction créée.",
        details: approveData.message || "Erreur inconnue"
      }, { status: 403 });
    }

    // 3. VÉRIFICATION: Le paiement existe-t-il vraiment sur Pi Network?
    // On récupère les détails du paiement pour confirmer qu'il est valide
    const verifyRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
      },
    });

    if (!verifyRes.ok) {
      console.error("Impossible de vérifier le paiement Pi");
      return NextResponse.json({ 
        error: "Impossible de vérifier le paiement auprès de Pi Network" 
      }, { status: 403 });
    }

    const paymentDetails = await verifyRes.json();
    
    // Vérifier que le paiement est bien destiné à notre app et a le bon statut
    if (paymentDetails.status?.developer_approved === false) {
      return NextResponse.json({ 
        error: "Le paiement n'a pas été approuvé par Pi Network" 
      }, { status: 403 });
    }

    // Utiliser le montant vérifié par Pi Network, pas celui envoyé par le client
    const verifiedAmount = parseFloat(paymentDetails.amount || amount);

    // 4. VÉRIFICATION ANTI-DOUBLON
    const existingTx = await prisma.transaction.findFirst({
      where: {
        OR: [
          { externalId: paymentId },
          { blockchainTx: txid }
        ]
      }
    });

    if (existingTx && existingTx.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ 
        success: true, 
        message: "Transaction déjà traitée",
        transaction: existingTx 
      });
    }

    // 5. TRANSACTION ATOMIQUE PRISMA - Création sécurisée
    const result = await prisma.$transaction(async (tx) => {
      
      // Gérer le Wallet avec UPSERT
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: {},
        create: {
          userId,
          currency: "PI",
          balance: 0,
          type: WalletType.PI
        }
      });

      let transaction;

      if (existingTx) {
        // Mettre à jour la transaction existante
        transaction = await tx.transaction.update({
          where: { id: existingTx.id },
          data: {
            externalId: paymentId,
            blockchainTx: txid || null,
            toWalletId: wallet.id,
            toUserId: userId,
            amount: verifiedAmount, // Utiliser le montant vérifié
            description: memo || existingTx.description || "Dépôt Pi Network",
          }
        });
      } else {
        // Créer nouvelle transaction uniquement si paymentId vérifié
        transaction = await tx.transaction.create({
          data: {
            reference: `PI-DEP-${paymentId.slice(-6).toUpperCase()}`,
            externalId: paymentId,
            blockchainTx: txid || null,
            amount: verifiedAmount,
            currency: "PI",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.PENDING, // PENDING jusqu'à /complete
            description: memo || "Dépôt Pi Network (vérifié)",
            toUserId: userId,
            toWalletId: wallet.id,
            metadata: {
              piVerified: true,
              verifiedAt: new Date().toISOString(),
              piStatus: paymentDetails.status
            }
          }
        });
      }

      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ 
      success: true, 
      transaction: result,
      message: "Paiement approuvé. En attente de confirmation blockchain."
    });

  } catch (error: any) {
    console.error("[APPROVE_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
