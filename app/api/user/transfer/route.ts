export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    // AJOUT DE AWAIT ICI :
    const payload = await verifyAuth(req);

    // Maintenant payload sera soit l'objet utilisateur, soit null
    if (!payload || !payload.id) {
      console.error("Échec Auth: Payload nul ou ID manquant");
      return NextResponse.json({ error: "Session expirée ou non autorisée" }, { status: 401 });
    }

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

    if (!sender) {
      return NextResponse.json({ error: "Expéditeur introuvable" }, { status: 404 });
    }

    const senderWallet = sender.wallets[0];
    if (!senderWallet || senderWallet.balance < transferAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // 2. Trouver le destinataire
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { id: recipientIdentifier },
          { username: recipientIdentifier },
          { email: recipientIdentifier },
          { phone: recipientIdentifier }
        ]
      },
      include: { wallets: { where: { currency: "PI" } } }
    });

    if (!recipient || recipient.id === sender.id) {
      return NextResponse.json({ error: "Destinataire introuvable ou invalide" }, { status: 404 });
    }

    const recipientWallet = recipient.wallets[0];
    if (!recipientWallet) {
      return NextResponse.json({ error: "Le destinataire n'a pas de Wallet PI" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: transferAmount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `TRF-${nanoid(10).toUpperCase()}`,
          amount: transferAmount,
          type: 'TRANSFER',
          status: 'SUCCESS',
          description: description || `Transfert à ${recipient.username || recipient.name}`,
          fromUserId: sender.id,
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
    return NextResponse.json({
      error: "Erreur lors du transfert",
      details: error.message
    }, { status: 500 });
  }
}
