export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    // 1. GESTION ROBUSTE DES SECRETS
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    // 2. AUTHENTIFICATION VIA COOKIE (Standard PimPay)
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value; // Harmonisé avec tes autres fichiers
    
    if (!token) {
      return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter" }, { status: 401 });
    }

    let senderId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      senderId = payload.id as string;
    } catch (err) {
      return NextResponse.json({ error: "Authentification invalide" }, { status: 401 });
    }

    // 3. RÉCUPÉRATION ET VALIDATION DES DONNÉES
    const body = await req.json().catch(() => ({}));
    const { recipientIdentifier, amount, currency, description } = body;

    const transferAmount = parseFloat(amount);
    if (!recipientIdentifier || isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Données de transfert invalides" }, { status: 400 });
    }

    const transferCurrency = currency || "PI";
    
    // Récupération des frais depuis la config système (ou fixe si manquant)
    const config = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    const fee = config?.transactionFee || 0.01; 
    const totalToDebit = transferAmount + fee;

    // 4. TRANSACTION PRISMA ATOMIQUE (Protection contre la corruption de données)
    const result = await prisma.$transaction(async (tx) => {
      // A. Vérifier le solde de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < totalToDebit) {
        throw new Error(`Solde ${transferCurrency} insuffisant (Requis: ${totalToDebit.toFixed(4)})`);
      }

      // B. Trouver le destinataire
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: recipientIdentifier },
            { phone: recipientIdentifier },
            { email: recipientIdentifier }, // Ajouté pour plus de flexibilité
            { walletAddress: recipientIdentifier }
          ]
        },
        select: { id: true, status: true }
      });

      if (!recipient) throw new Error("Destinataire introuvable.");
      if (recipient.id === senderId) throw new Error("Envoi vers vous-même impossible.");
      if (recipient.status !== "ACTIVE") throw new Error("Le compte destinataire est inactif.");

      // C. Trouver ou créer le wallet du destinataire
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
        update: { balance: { increment: transferAmount } },
        create: { 
          userId: recipient.id, 
          currency: transferCurrency, 
          balance: transferAmount, 
          type: transferCurrency === "PI" ? "PI" : "FIAT" 
        }
      });

      // D. Débiter l'expéditeur
      const updatedSenderWallet = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalToDebit } }
      });

      if (updatedSenderWallet.balance < 0) throw new Error("Erreur de synchronisation du solde.");

      // E. Créer l'enregistrement de la Transaction (Status COMPLETED selon schéma)
      return await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${senderId.slice(-4)}`.toUpperCase(),
          amount: transferAmount,
          fee: fee,
          type: "TRANSFER",
          currency: transferCurrency,
          description: description || `Transfert PimPay vers ${recipientIdentifier}`,
          status: "COMPLETED",
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
          metadata: { feeApplied: fee }
        }
      });
    });

    // 5. CRÉATION D'UNE NOTIFICATION POUR LE DESTINATAIRE (Non-bloquant)
    try {
      await prisma.notification.create({
        data: {
          userId: result.toUserId!,
          title: "Argent reçu !",
          message: `Vous avez reçu ${result.amount} ${result.currency} de la part d'un utilisateur PimPay.`,
          type: "success"
        }
      });
    } catch (e) {
      console.warn("Notification de transfert échouée");
    }

    return NextResponse.json({ 
      success: true, 
      message: "Transfert effectué avec succès",
      transaction: result 
    });

  } catch (error: any) {
    console.error("TRANSFER_CRITICAL_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Échec du transfert" }, { status: 400 });
  }
}
