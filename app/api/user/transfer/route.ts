import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification via Cookie (comme pour le profil et la carte)
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const senderId = payload.id as string;

    // 2. Récupération des données
    const { recipientIdentifier, amount, currency, description } = await req.json();

    if (!recipientIdentifier || !amount || amount <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const transferCurrency = currency || "PI";
    const fee = 0.01; // Frais fixe PimPay
    const totalToDebit = amount + fee;

    // 3. Transaction Prisma Atomique
    const result = await prisma.$transaction(async (tx) => {
      // A. Vérifier le solde de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < totalToDebit) {
        throw new Error(`Solde ${transferCurrency} insuffisant.`);
      }

      // B. Trouver le destinataire (par username, phone ou walletAddress)
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: recipientIdentifier },
            { phone: recipientIdentifier },
            { walletAddress: recipientIdentifier }
          ]
        }
      });

      if (!recipient) throw new Error("Destinataire introuvable.");
      if (recipient.id === senderId) throw new Error("Envoi vers soi-même impossible.");

      // C. Trouver ou créer le wallet du destinataire
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
        update: { balance: { increment: amount } },
        create: { userId: recipient.id, currency: transferCurrency, balance: amount, type: "PI" }
      });

      // D. Débiter l'expéditeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalToDebit } }
      });

      // E. Créer l'enregistrement de la Transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase(),
          amount: amount,
          fee: fee,
          currency: transferCurrency,
          description: description || `Transfert de ${transferCurrency}`,
          status: "SUCCESS",
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
        }
      });

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("Transfer Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
