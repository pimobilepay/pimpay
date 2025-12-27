export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';
import { nanoid } from 'nanoid'; // ou utilise une fonction de référence aléatoire

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { recipientIdentifier, amount, description } = await req.json();
    const transferAmount = parseFloat(amount);

    if (!recipientIdentifier || isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 1. Trouver l'expéditeur et son wallet PI
    const sender = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { wallets: { where: { currency: "PI" } } }
    });

    const senderWallet = sender?.wallets[0];
    if (!senderWallet || senderWallet.balance < transferAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // 2. Trouver le destinataire (par username, email ou phone)
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: recipientIdentifier },
          { email: recipientIdentifier },
          { phone: recipientIdentifier }
        ]
      },
      include: { wallets: { where: { currency: "PI" } } }
    });

    if (!recipient || recipient.id === sender?.id) {
      return NextResponse.json({ error: "Destinataire introuvable ou invalide" }, { status: 404 });
    }

    const recipientWallet = recipient.wallets[0];
    if (!recipientWallet) {
      return NextResponse.json({ error: "Le destinataire n'a pas de Wallet PI" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Tout ou rien)
    const result = await prisma.$transaction(async (tx) => {
      // Déduire de l'expéditeur
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // Ajouter au destinataire
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: transferAmount } }
      });

      // Créer la transaction de type TRANSFER
      const transaction = await tx.transaction.create({
        data: {
          reference: `TRF-${nanoid(10).toUpperCase()}`,
          amount: transferAmount,
          type: 'TRANSFER',
          status: 'SUCCESS',
          description: description || `Transfert à ${recipient.username}`,
          fromUserId: sender?.id,
          fromWalletId: senderWallet.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
        }
      });

      return transaction;
    });

    return NextResponse.json({ message: "Transfert réussi", transaction: result });

  } catch (error: any) {
    console.error("TRANSFER_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du transfert" }, { status: 500 });
  }
}
