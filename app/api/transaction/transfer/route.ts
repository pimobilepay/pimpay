import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PI_CONSENSUS_RATE, calculateExchangeWithFee } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION SÉCURISÉE
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const senderId = payload.id as string;

    // 2. RÉCUPÉRATION DU CORPS DE LA REQUÊTE
    const body = await req.json();
    const { recipientEmail, amount, note } = body;

    if (!recipientEmail || !amount || amount <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 3. VÉRIFICATION DU SOLDE ET DU DESTINATAIRE
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { wallets: { take: 1 } }
    });

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      include: { wallets: { take: 1 } }
    });

    if (!sender || !sender.wallets[0]) return NextResponse.json({ error: "Expéditeur introuvable" }, { status: 404 });
    if (!recipient || !recipient.wallets[0]) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });
    if (sender.id === recipient.id) return NextResponse.json({ error: "Transfert vers soi-même interdit" }, { status: 400 });

    const senderWallet = sender.wallets[0];
    const recipientWallet = recipient.wallets[0];

    if (senderWallet.balance < amount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // 4. CALCUL DE LA VALEUR GCV ET DES FRAIS (Conformité)
    const exchange = calculateExchangeWithFee(amount, "USD");
    const valueInUsd = amount * PI_CONSENSUS_RATE;

    // 5. TRANSACTION ATOMIQUE PRISMA (Tout passe ou tout échoue)
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Débiter l'expéditeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } }
      });

      // Créditer le destinataire
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amount } }
      });

      // Créer l'historique de transaction
      const transaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: "TRANSFER",
          status: "COMPLETED",
          fromUserId: sender.id,
          toUserId: recipient.id,
          note: note || "Transfert P2P",
          fee: exchange.fee / PI_CONSENSUS_RATE // On stocke les frais en PI
        }
      });

      // 6. DÉTECTION AML (Si transfert > 10,000 USD en valeur GCV)
      if (valueInUsd >= 10000) {
        await tx.auditLog.create({
          data: {
            action: "LARGE_TRANSFER_DETECTED",
            details: `Transfert suspect de ${amount} PI (Valeur: ${valueInUsd.toLocaleString()} USD). De: ${sender.email} à: ${recipient.email}`,
            userId: sender.id,
            adminName: "SYSTEM_MONITOR"
          }
        });
      }

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Transfert réussi",
      transactionId: transactionResult.id,
      newBalance: senderWallet.balance - amount
    });

  } catch (error: any) {
    console.error("TRANSFER_ERROR:", error.message);
    return NextResponse.json({ error: "Échec du transfert" }, { status: 500 });
  }
}
