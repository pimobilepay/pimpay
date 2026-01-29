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
    let { recipientIdentifier, amount, currency, description } = body;

    const cleanIdentifier = recipientIdentifier.startsWith('@') ? recipientIdentifier.substring(1) : recipientIdentifier;
    const transferAmount = parseFloat(amount);
    const transferCurrency = (currency || "XAF").toUpperCase();

    // 1. Récupérer l'expéditeur (Nécessaire avant la transaction pour la clé privée)
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { wallets: true }
    });

    if (!sender) throw new Error("Utilisateur introuvable.");

    // --- DÉBUT DE LA TRANSACTION ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 2. Chercher si c'est un utilisateur interne (Maintenant à l'intérieur du bloc 'tx')
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
        throw new Error("Solde insuffisant dans votre wallet PimPay.");
      }

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // CAS A : RETRAIT VERS BLOCKCHAIN EXTERNE (SDA)
      if (isExternalSDA && transferCurrency === "SDA") {
        if (!sender.sidraPrivateKey) throw new Error("Votre clé privée Sidra n'est pas configurée.");

        try {
          const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
          const wallet = new ethers.Wallet(sender.sidraPrivateKey, provider);
          const val = ethers.parseEther(amount.toString());

          // On émet la transaction avant de valider le débit en DB
          const blockchainTx = await wallet.sendTransaction({
            to: cleanIdentifier,
            value: val
          });
          
          txHash = blockchainTx.hash;
        } catch (err: any) {
          // Si la blockchain refuse (ex: pas assez de Gas), on stoppe tout ici
          throw new Error(`Échec Blockchain (Vérifiez votre GAS) : ${err.message}`);
        }
      } 
      
      // CAS B : TRANSFERT INTERNE PIMPAY
      else if (recipient) {
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

        await tx.notification.create({
          data: {
            userId: recipient.id,
            title: "Argent reçu ! 📥",
            message: `Vous avez reçu ${transferAmount} ${transferCurrency} de @${sender.username}.`,
            type: "PAYMENT_RECEIVED"
          }
        });
      } else {
        throw new Error("Destinataire introuvable ou adresse invalide.");
      }

      // 3. DÉBIT DE L'EXPÉDITEUR
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // 4. ENREGISTREMENT DE LA TRANSACTION
      const newTx = await tx.transaction.create({
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
          description: description || (txHash ? `Retrait SDA externe` : `Transfert vers @${recipient?.username}`)
        }
      });

      // 5. NOTIFICATION EXPÉDITEUR
      await tx.notification.create({
        data: {
          userId: senderId,
          title: "Transaction réussie 🚀",
          message: txHash 
            ? `Retrait de ${transferAmount} SDA envoyé sur la blockchain.`
            : `Transfert de ${transferAmount} ${transferCurrency} effectué.`,
          type: "PAYMENT_SENT"
        }
      });

      return newTx;
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("Erreur Transfert PimPay:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
