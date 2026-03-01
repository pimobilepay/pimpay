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

      // 4. Préparer le tag pour le Worker (Indispensable pour l'exécution réelle)
      // Le Worker cherche les transactions avec "-EXT-" dans blockchainTx
      const tempHash = `XRP-EXT-${Date.now()}`;

      // 5. Débit immédiat du solde interne (Sécurité bancaire)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // 6. Création de l'enregistrement de transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `PIM-XRP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount: transferAmount,
          currency: "XRP",
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS, // Marqué success car le débit est fait
          fromUserId: session.id,
          fromWalletId: senderWallet.id,
          blockchainTx: tempHash, // Le Worker remplacera ceci par le vrai hash plus tard
          description: description || `Transfert XRP vers ${toAddress}` // Le Worker lira l'adresse ici
        }
      });

      // 7. Notification à l'utilisateur
      await tx.notification.create({
        data: {
          userId: session.id,
          title: "Transfert initié 🚀",
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
