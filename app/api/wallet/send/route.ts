export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

const SIDRA_RPC = "https://rpc.sidrachain.com";

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();

    // 1. FLEXIBILITÉ MAXIMALE (Son ajout pour éviter l'erreur 400)
    let recipientIdentifier = body.recipientIdentifier || body.address || body.to || body.recipientId;
    if (!recipientIdentifier) throw new Error("L'adresse de destination est vide.");

    const idStr = String(recipientIdentifier).trim();
    const cleanIdentifier = idStr.startsWith('@') ? idStr.substring(1) : idStr;

    const transferAmount = parseFloat(body.amount);
    const transferCurrency = (body.currency || "SDA").toUpperCase();

    // 2. RÉCUPÉRATION DE L'EXPÉDITEUR
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { wallets: true }
    });
    if (!sender) throw new Error("Expéditeur introuvable.");

    // --- TRANSACTION ATOMIQUE ---
    const result = await prisma.$transaction(async (tx) => {
      
      // Recherche du destinataire interne PimPay
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { sidraAddress: cleanIdentifier }
          ]
        }
      });

      const isExternalSDA = cleanIdentifier.startsWith('0x') && cleanIdentifier.length === 42;
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde ${transferCurrency} insuffisant.`);
      }

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // A. CAS EXTERNE : BLOCKCHAIN (SDA)
      if (isExternalSDA && transferCurrency === "SDA") {
        if (!sender.sidraPrivateKey) throw new Error("Clé privée Sidra non configurée.");
        try {
          const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
          const wallet = new ethers.Wallet(sender.sidraPrivateKey, provider);
          
          const blockchainTx = await wallet.sendTransaction({
            to: cleanIdentifier,
            value: ethers.parseEther(transferAmount.toString())
          });
          txHash = blockchainTx.hash;
        } catch (err: any) {
          throw new Error(`Blockchain Refusée : ${err.message}`);
        }
      } 
      
      // B. CAS INTERNE : TRANSFERT PIMPAY
      else if (recipient) {
        if (recipient.id === senderId) throw new Error("Auto-transfert interdit.");
        toUserId = recipient.id;
        const recipientWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
          update: { balance: { increment: transferAmount } },
          create: {
            userId: recipient.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: transferCurrency === "SDA" ? WalletType.SIDRA : WalletType.FIAT
          }
        });
        toWalletId = recipientWallet.id;

        // --- NOTIFICATION DESTINATAIRE (Mon ajout crucial) ---
        await tx.notification.create({
          data: {
            userId: recipient.id,
            title: "Argent reçu ! 📥",
            message: `Vous avez reçu ${transferAmount} ${transferCurrency} de @${sender.username}.`,
            type: "PAYMENT_RECEIVED"
          }
        });
      } else {
        throw new Error("Destinataire introuvable sur PimPay.");
      }

      // C. DÉBIT ET LOG TRANSACTION
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: toUserId,
          toWalletId: toWalletId,
          blockchainTx: txHash,
          description: body.description || (txHash ? `Retrait SDA externe` : `Transfert vers @${recipient?.username}`)
        }
      });

      // --- NOTIFICATION EXPÉDITEUR ---
      await tx.notification.create({
        data: {
          userId: senderId,
          title: "Succès ! 🚀",
          message: txHash ? "Envoi blockchain réussi." : "Transfert interne validé.",
          type: "PAYMENT_SENT"
        }
      });

      return transaction;

    }, { timeout: 35000 });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("PimPay API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
