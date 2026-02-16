export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PI_CONSENSUS_RATE, calculateExchangeWithFee } from "@/lib/exchange";

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

    // 2. RÉCUPÉRATION ET VALIDATION
    const body = await req.json();
    const { recipientEmail, amount, note } = body;
    const amountNum = parseFloat(amount);

    if (!recipientEmail || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 3. RECHERCHE DES ACTEURS ET DES WALLETS (Prisma Pluriel : wallets)
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { wallets: { where: { currency: "PI" }, take: 1 } }
    });

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      include: { wallets: { where: { currency: "PI" }, take: 1 } }
    });

    if (!sender || !sender.wallets[0]) {
        return NextResponse.json({ error: "Expéditeur ou Wallet PI introuvable" }, { status: 404 });
    }
    if (!recipient || !recipient.wallets[0]) {
        return NextResponse.json({ error: "Destinataire ou Wallet PI introuvable" }, { status: 404 });
    }
    if (sender.id === recipient.id) {
        return NextResponse.json({ error: "Transfert vers soi-même interdit" }, { status: 400 });
    }

    const senderWallet = sender.wallets[0];
    const recipientWallet = recipient.wallets[0];

    if (senderWallet.balance < amountNum) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // 4. CALCULS (Conformité GCV)
    const exchange = calculateExchangeWithFee(amountNum, "USD");
    const valueInUsd = amountNum * PI_CONSENSUS_RATE;

    // 5. TRANSACTION ATOMIQUE (Correction Erreurs Prisma)
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Débiter l'expéditeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amountNum } }
      });

      // Créditer le destinataire
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amountNum } }
      });

      // Création de la transaction avec REFERENCE OBLIGATOIRE
      return await tx.transaction.create({
        data: {
          // Génération d'une référence unique pour Pimpay
          reference: `P2P-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          netAmount: amountNum,
          currency: "PI",
          type: "TRANSFER",
          status: "COMPLETED",
          fromUserId: sender.id,
          toUserId: recipient.id,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
          description: note || "Transfert P2P", // 'description' est dans ton schéma
          fee: exchange.fee / PI_CONSENSUS_RATE 
        }
      });
    });

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
    console.error("TRANSFER_CRITICAL_ERROR:", error.message);
    return NextResponse.json({ error: "Échec du transfert lors du traitement" }, { status: 500 });
  }
}
