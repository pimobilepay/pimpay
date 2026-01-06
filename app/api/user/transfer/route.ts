import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Récupération sécurisée du token
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Session manquante" }, { status: 401 });
    }

    // 2. Vérification de la session
    const dbSession = await prisma.session.findUnique({
      where: { token: token },
      include: { user: true },
    });

    if (!dbSession || !dbSession.isActive || !dbSession.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const senderId = dbSession.userId;
    const body = await req.json();
    const { recipient, amount } = body;

    // 3. Validation du destinataire (Correction de l'erreur .replace)
    if (!recipient || typeof recipient !== 'string') {
      return NextResponse.json({ error: "Destinataire invalide" }, { status: 400 });
    }

    const cleanRecipient = recipient.trim().replace("@", "");
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 4. Recherche du destinataire
    const receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanRecipient },
          { phone: recipient.trim() }
        ]
      }
    });

    if (!receiver) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });
    if (receiver.id === senderId) return NextResponse.json({ error: "Action impossible" }, { status: 400 });

    // 5. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      // Récupérer les frais
      const config = await tx.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const networkFee = config?.transactionFee || 0.01;
      const totalToPay = transferAmount + networkFee;

      // Vérifier le solde PI de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < totalToPay) {
        throw new Error("Solde PI insuffisant (montant + frais)");
      }

      // A. Débiter l'expéditeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalToPay } }
      });

      // B. Créditer le destinataire
      const receiverWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: receiver.id, currency: "PI" } },
        update: { balance: { increment: transferAmount } },
        create: { 
          userId: receiver.id, 
          currency: "PI", 
          balance: transferAmount, 
          type: "PI" // On utilise l'enum du schéma
        }
      });

      // C. Créer l'enregistrement de la transaction
      return await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: transferAmount,
          fee: networkFee,
          currency: "PI",
          status: "SUCCESS",
          type: "TRANSFER", // Préciser le type si ton schéma le demande
          description: `Transfert vers ${receiver.username || receiver.phone}`,
          fromUserId: senderId,
          toUserId: receiver.id,
          fromWalletId: senderWallet.id,
          toWalletId: receiverWallet.id
        }
      });
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("TRANSFER_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
