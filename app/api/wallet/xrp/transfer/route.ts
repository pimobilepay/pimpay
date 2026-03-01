import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { toAddress, amount, description } = await req.json();
    const transferAmount = parseFloat(amount);

    // 1. Validations de base
    if (!toAddress || isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Montant ou adresse invalide" }, { status: 400 });
    }

    // 2. Validation du format d'adresse XRP (Regex robuste)
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(toAddress)) {
      return NextResponse.json({ error: "L'adresse XRP n'est pas valide" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 3. Vérifier le wallet XRP de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: session.id, currency: "XRP" } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error("Solde XRP insuffisant pour effectuer ce transfert");
      }

      // 4. Debit immediat du solde interne
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // 5. Creation de la transaction PENDING pour que le worker l'envoie sur la blockchain
      const transaction = await tx.transaction.create({
        data: {
          reference: `PIM-XRP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount: transferAmount,
          currency: "XRP",
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.PENDING,
          fromUserId: session.id,
          fromWalletId: senderWallet.id,
          description: description || `Envoi XRP vers ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
          metadata: {
            externalAddress: toAddress,
            network: "XRP",
            isBlockchainWithdraw: true,
          }
        }
      });

      // 6. Notification
      await tx.notification.create({
        data: {
          userId: session.id,
          title: "Transfert XRP en cours",
          message: `${transferAmount} XRP en cours d'envoi vers ${toAddress.slice(0, 8)}...`,
          type: "PAYMENT_SENT"
        }
      });

      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ 
      success: true, 
      message: "Transfert enregistré et en cours de traitement",
      transaction: result 
    });

  } catch (error: any) {
    console.error("[XRP_TRANSFER_API_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
