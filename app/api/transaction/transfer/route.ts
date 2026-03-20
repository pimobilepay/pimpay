export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PI_CONSENSUS_RATE, calculateExchangeWithFee } from "@/lib/exchange";
import { getFeeConfig, calculateFee } from "@/lib/fees";

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION SÉCURISÉE (Correction structure Pimpay)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const senderId = (payload.id || payload.userId) as string;

    // 2. RECUPERATION ET VALIDATION
    const body = await req.json();
    const { recipientEmail, recipientIdentifier, recipient: recipientInput, amount, note } = body;
    const recipientId = recipientEmail || recipientIdentifier || recipientInput;
    const amountNum = parseFloat(amount);

    console.log("[v0] [TRANSFER] Params:", { senderId, recipientId, amount: amountNum });

    if (!recipientId || isNaN(amountNum) || amountNum <= 0) {
      console.log("[v0] [TRANSFER] Erreur: Donnees invalides");
      return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
    }

    // 3. RECHERCHE DES ACTEURS ET DES WALLETS (Prisma Pluriel : wallets)
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        name: true,
        username: true,
        wallets: { where: { currency: "PI" }, take: 1 }
      }
    });

    // Recherche du destinataire par email, username ou telephone
    const cleanInput = recipientId.startsWith("@") ? recipientId.substring(1) : recipientId;
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanInput, mode: "insensitive" } },
          { username: { equals: cleanInput, mode: "insensitive" } },
          { phone: cleanInput },
          { piUserId: cleanInput },
        ]
      },
      include: { wallets: { where: { currency: "PI" }, take: 1 } }
    });

    console.log("[v0] [TRANSFER] Expediteur:", sender?.id, "Destinataire:", recipient?.id);

    if (!sender || !sender.wallets[0]) {
        console.log("[v0] [TRANSFER] Erreur: Expediteur ou Wallet PI introuvable");
        return NextResponse.json({ error: "Expediteur ou Wallet PI introuvable" }, { status: 404 });
    }
    if (!recipient) {
        console.log("[v0] [TRANSFER] Erreur: Destinataire introuvable pour:", recipientId);
        return NextResponse.json({ error: "Destinataire introuvable. Verifiez l'email, le username ou le telephone." }, { status: 404 });
    }
    if (sender.id === recipient.id) {
        console.log("[v0] [TRANSFER] Erreur: Auto-transfert");
        return NextResponse.json({ error: "Transfert vers soi-meme interdit" }, { status: 400 });
    }

    const senderWallet = sender.wallets[0];

    if (senderWallet.balance < amountNum) {
      console.log("[v0] [TRANSFER] Erreur: Solde insuffisant", senderWallet.balance, "<", amountNum);
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // 4. CALCULS (Conformite GCV) - Frais centralises
    const feeConfig = await getFeeConfig();
    const { feeAmount: transferFeeAmount } = calculateFee(amountNum, feeConfig, "transfer");
    const valueInUsd = amountNum * PI_CONSENSUS_RATE;

    // 5. TRANSACTION ATOMIQUE (Correction Erreurs Prisma)
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Debiter l'expediteur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amountNum } }
      });

      // Crediter le destinataire (UPSERT pour creer le wallet s'il n'existe pas)
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipient.id, currency: "PI" } },
        update: { balance: { increment: amountNum } },
        create: { userId: recipient.id, currency: "PI", balance: amountNum, type: "PI" }
      });
      
      console.log("[v0] [TRANSFER] Wallet destinataire credite:", recipientWallet.id, "solde:", recipientWallet.balance);

      // Creation de la transaction avec REFERENCE OBLIGATOIRE
      const transaction = await tx.transaction.create({
        data: {
          // Generation d'une reference unique pour Pimpay
          reference: `P2P-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          netAmount: amountNum,
          currency: "PI",
          type: "TRANSFER",
          status: "SUCCESS",
          fromUserId: sender.id,
          toUserId: recipient.id,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
          description: note || "Transfert P2P",
          fee: transferFeeAmount
        }
      });
      
      // Creer une notification pour le destinataire
      await tx.notification.create({
        data: {
          userId: recipient.id,
          title: "Paiement recu !",
          message: `Vous avez recu ${amountNum.toLocaleString()} PI de ${sender.username || sender.name || 'un utilisateur PimPay'}.`,
          type: "PAYMENT_RECEIVED",
          metadata: { amount: amountNum, currency: "PI", reference: transaction.reference }
        }
      }).catch(() => {});
      
      return transaction;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });
    
    console.log("[v0] [TRANSFER] Transaction REUSSIE:", transactionResult.reference);

    // 6. LOG DE SÉCURITÉ (AML)
    if (valueInUsd >= 10000) {
      await prisma.auditLog.create({
        data: {
          action: "LARGE_TRANSFER_DETECTED",
          details: `Transfert GCV élevé: ${amountNum} PI ($${valueInUsd.toLocaleString()})`,
          adminName: "SYSTEM_MONITOR",
          adminId: sender.id // On utilise adminId car c'est le champ du schéma
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Transfert réussi",
      transactionId: transactionResult.id,
      newBalance: senderWallet.balance - amountNum
    });

  } catch (error: any) {
    console.error("[v0] [TRANSFER] ERREUR CRITIQUE:", error.message);
    return NextResponse.json({ error: error.message || "Echec du transfert lors du traitement" }, { status: 500 });
  }
}
