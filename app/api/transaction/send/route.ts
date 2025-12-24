import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function POST(request: Request) {
  try {
    // 1. Extraire le Token pour identifier l'envoyeur
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const senderId = (payload.userId || payload.sub) as string;

    // 2. Récupérer les données envoyées par la page Send
    const { amount, recipientId, description } = await request.json();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 3. Exécuter la transaction atomique (Solde + Historique)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Débiter l'expéditeur (le Wallet PI)
      const senderWallet = await tx.wallet.update({
        where: { userId_currency: { userId: senderId, currency: "PI" } },
        data: { balance: { decrement: numericAmount } }
      });

      if (senderWallet.balance < 0) {
        throw new Error("Solde insuffisant");
      }

      // B. Créditer le destinataire (ou créer son wallet s'il n'existe pas)
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipientId, currency: "PI" } },
        update: { balance: { increment: numericAmount } },
        create: {
          userId: recipientId,
          currency: "PI",
          balance: numericAmount,
          type: "PI"
        }
      });

      // C. Créer l'enregistrement dans la table Transaction
      return await tx.transaction.create({
        data: {
          reference: `TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount: numericAmount,
          type: "TRANSFER",
          status: "SUCCESS",
          description: description || "Transfert Pi",
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipientId,
          toWalletId: recipientWallet.id,
          netAmount: numericAmount
        }
      });
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("ERREUR_TRANSACTION:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
