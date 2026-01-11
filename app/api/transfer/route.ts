export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// ... (imports auth)

export async function POST(req: Request) {
  try {
    const { identifier, amount, note } = await req.json();
    const senderId = "..." // Récupéré via ton token JWT

    return await prisma.$transaction(async (tx) => {
      // 1. Trouver le Wallet PI de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error("Solde PI insuffisant");
      }

      // 2. Trouver le destinataire ET son Wallet PI
      const receiver = await tx.user.findFirst({
        where: { OR: [{ email: identifier }, { phone: identifier }] },
        include: { wallets: { where: { currency: "PI" } } }
      });

      if (!receiver || !receiver.wallets[0]) {
        throw new Error("Destinataire ou Wallet PI introuvable");
      }

      const receiverWallet = receiver.wallets[0];

      // 3. Mise à jour des balances
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } }
      });

      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: amount } }
      });

      // 4. Création de la transaction avec les relations correctes
      const transaction = await tx.transaction.create({
        data: {
          reference: `TRF-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amount,
          type: "TRANSFER",
          status: "SUCCESS",
          fromUserId: senderId,
          fromWalletId: senderWallet.id, // Relation Prisma
          toUserId: receiver.id,
          toWalletId: receiverWallet.id, // Relation Prisma
          note: note
        }
      });

      return NextResponse.json({ success: true, transaction });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
