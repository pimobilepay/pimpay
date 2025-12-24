import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    const senderId = payload.userId as string;

    const { identifier, amount, note } = await req.json(); // identifier = email ou téléphone

    if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver le destinataire (par email ou téléphone)
      const receiver = await tx.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }]
        }
      });

      if (!receiver) throw new Error("Utilisateur introuvable");
      if (receiver.id === senderId) throw new Error("Vous ne pouvez pas vous envoyer des fonds");

      // 2. Vérifier le solde du parrain (Sender)
      const senderWallet = await tx.wallet.findFirst({
        where: { userId: senderId, currency: "PI" }
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error("Solde PI insuffisant");
      }

      // 3. Effectuer le transfert
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } }
      });

      await tx.wallet.updateMany({
        where: { userId: receiver.id, currency: "PI" },
        data: { balance: { increment: amount } }
      });

      // 4. Créer le log de transaction
      return await tx.transaction.create({
        data: {
          reference: `TRF-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amount,
          type: "TRANSFER",
          status: "SUCCESS",
          fromUserId: senderId,
          toUserId: receiver.id,
          description: note || `Transfert vers ${receiver.firstName || identifier}`,
        }
      });
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
