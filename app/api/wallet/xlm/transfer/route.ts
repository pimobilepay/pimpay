import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";
import * as StellarSdk from '@stellar/stellar-sdk'; // Pour la validation d'adresse

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { toAddress, amount, memo } = await req.json();
    const transferAmount = parseFloat(amount);

    // 1. Validations de base
    if (!toAddress || isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Montant ou adresse invalide" }, { status: 400 });
    }

    // 2. Validation robuste de l'adresse Pi (Format Ed25519 standard)
    // Utiliser le SDK est plus sûr qu'une Regex pour manipuler de l'argent réel
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(toAddress)) {
      return NextResponse.json({ error: "L'adresse Pi Network est invalide" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 3. Vérifier le wallet PI de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: session.id, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error("Solde Pi insuffisant pour effectuer ce transfert");
      }

      // 4. Debit immediat
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // 5. Creation de la transaction PENDING pour que le worker l'envoie sur la blockchain
      const transaction = await tx.transaction.create({
        data: {
          reference: `PIM-PI-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount: transferAmount,
          currency: "PI",
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.PENDING,
          fromUserId: session.id,
          fromWalletId: senderWallet.id,
          description: `Envoi Pi vers ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
          metadata: {
            externalAddress: toAddress,
            network: "PI",
            isBlockchainWithdraw: true,
            ...(memo ? { memo } : {}),
          }
        }
      });

      // 6. Notification
      await tx.notification.create({
        data: {
          userId: session.id,
          title: "Transfert Pi en cours",
          message: `Votre transfert de ${transferAmount} PI vers ${toAddress.slice(0, 6)}...${toAddress.slice(-4)} est en attente de traitement sur le Mainnet.`,
          type: "PAYMENT_SENT"
        }
      });

      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: "Transfert Pi enregistré avec succès",
      transaction: result
    });

  } catch (error: any) {
    console.error("[PI_TRANSFER_API_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
