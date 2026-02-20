export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

const RPC_CONFIGS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  USDC: "https://polygon-rpc.com",
};

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();
    let { recipientIdentifier, amount, currency, description } = body;

    const cleanIdentifier = recipientIdentifier.startsWith('@') ? recipientIdentifier.substring(1) : recipientIdentifier;
    const transferAmount = parseFloat(amount);
    const transferCurrency = (currency || "XAF").toUpperCase();

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    // --- TRANSACTION ATOMIQUE ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. RECHERCHE SÉCURISÉE DU WALLET (Correction de l'erreur findUnique)
      // On utilise upsert au cas où le wallet a été supprimé lors du cleanup
      const senderWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } },
        update: {}, // On ne change rien s'il existe
        create: {
          userId: senderId,
          currency: transferCurrency,
          balance: 0,
          type: transferCurrency === "PI" ? WalletType.PI : WalletType.FIAT
        }
      });

      if (senderWallet.balance < transferAmount) {
        throw new Error(`Solde insuffisant : ${senderWallet.balance} ${transferCurrency} disponibles.`);
      }

      // 2. IDENTIFIER LE DESTINATAIRE
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { walletAddress: cleanIdentifier }
          ]
        }
      });

      if (!recipient) throw new Error("Destinataire introuvable dans PimPay.");
      if (recipient.id === senderId) throw new Error("Impossible de s'envoyer à soi-même.");

      // 3. MISE À JOUR DES SOLDES (Débit / Crédit)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
        update: { balance: { increment: transferAmount } },
        create: {
          userId: recipient.id,
          currency: transferCurrency,
          balance: transferAmount,
          type: transferCurrency === "PI" ? WalletType.PI : WalletType.FIAT
        }
      });

      // 4. CRÉATION DE LA TRANSACTION (SUCCESS pour le graphique)
      return await tx.transaction.create({
        data: {
          reference: `PIM-TR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS, 
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
          description: description || `Transfert vers ${recipient.username || recipient.email}`,
          metadata: { cleanIdentifier }
        }
      });
    }, { timeout: 15000 });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ Erreur Transfert:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
