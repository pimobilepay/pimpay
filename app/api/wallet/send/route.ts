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
    const cookieStore = await cookies();

    // --- LE VACCIN HYBRIDE ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let senderId: string | null = null;

    if (piToken) {
      senderId = piToken;
    } else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        senderId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!senderId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();

    // 1. EXTRACTION DES DONNÉES
    let recipientIdentifier = body.recipientIdentifier || body.address || body.to;
    if (!recipientIdentifier) throw new Error("Où voulez-vous envoyer l'argent ?");

    const idStr = String(recipientIdentifier).trim();
    const cleanIdentifier = idStr.startsWith('@') ? idStr.substring(1) : idStr;
    const transferAmount = parseFloat(body.amount);
    const transferCurrency = (body.currency || "SDA").toUpperCase();

    // 2. RÉCUPÉRATION DE L'EXPÉDITEUR
    const sender = await prisma.user.findUnique({
      where: { id: senderId }
    });
    if (!sender) throw new Error("Expéditeur introuvable.");

    // --- TRANSACTION ATOMIQUE (SÉCURITÉ MAXIMALE) ---
    const result = await prisma.$transaction(async (tx) => {

      // On cherche si c'est un utilisateur PimPay (par pseudo, email ou adresse Sidra)
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
      const isExternalXRP = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(cleanIdentifier);
      const isExternalXLM = /^G[A-Z2-7]{55}$/.test(cleanIdentifier);
      
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde ${transferCurrency} insuffisant pour cette opération.`);
      }

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // A. CAS EXTERNE : ENVOI SUR LA BLOCKCHAIN SIDRA
      if (isExternalSDA && !recipient) {
        if (!sender.sidraPrivateKey) throw new Error("Votre clé privée Sidra n'est pas configurée.");
        try {
          const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
          const wallet = new ethers.Wallet(sender.sidraPrivateKey, provider);

          const blockchainTx = await wallet.sendTransaction({
            to: cleanIdentifier,
            value: ethers.parseEther(transferAmount.toString())
          });
          txHash = blockchainTx.hash;
        } catch (err: any) {
          throw new Error(`Erreur Blockchain : ${err.message}`);
        }
      }

      // B. CAS XRP EXTERNE
      else if (isExternalXRP && transferCurrency === "XRP" && !recipient) {
        txHash = `XRP-EXT-${Date.now()}`;
      }

      // C. CAS XLM EXTERNE  
      else if (isExternalXLM && transferCurrency === "XLM" && !recipient) {
        txHash = `XLM-EXT-${Date.now()}`;
      }

      // D. CAS INTERNE : TRANSFERT ENTRE MEMBRES PIMPAY
      else if (recipient) {
        if (recipient.id === senderId) throw new Error("Vous ne pouvez pas vous envoyer d'argent à vous-même.");
        
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

        // Notification pour le destinataire
        await tx.notification.create({
          data: {
            userId: recipient.id,
            title: "Argent reçu ! 📥",
            message: `Vous avez reçu ${transferAmount} ${transferCurrency} de @${sender.username || 'un utilisateur'}.`,
            type: "INFO"
          }
        });
      } else {
        throw new Error("Destinataire introuvable sur PimPay ou adresse invalide.");
      }

      // C. DÉBIT ET CRÉATION DU REÇU
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: toUserId,
          toWalletId: toWalletId,
          blockchainTx: txHash,
          description: body.description || (txHash ? `Retrait Sidra Chain` : `Vers @${recipient?.username}`)
        }
      });

      // Notification pour l'expéditeur
      await tx.notification.create({
        data: {
          userId: senderId,
          title: "Transfert envoyé ! 🚀",
          message: `Vos ${transferAmount} ${transferCurrency} ont été envoyés avec succès.`,
          type: "INFO"
        }
      });

      return transaction;
    }, { timeout: 40000 }); // Temps étendu pour la blockchain

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ [TRANSFER_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
