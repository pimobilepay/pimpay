export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 1. AUTHENTIFICATION
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "XAF").toUpperCase();
    const recipientInput = (body.recipientIdentifier || body.address || "").trim();

    if (!recipientInput || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Données de transfert invalides" }, { status: 400 });
    }

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Vérifier le solde de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency } }
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error(`Solde ${currency} insuffisant sur PimPay.`);
      }

      // B. RECHERCHE DU DESTINATAIRE (Interne vs Externe)
      // On nettoie l'input si c'est un @username
      const cleanInput = recipientInput.startsWith('@') ? recipientInput.substring(1) : recipientInput;

      const recipientUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanInput, mode: 'insensitive' } },
            { email: { equals: cleanInput, mode: 'insensitive' } },
            { sidraAddress: cleanInput },
            { walletAddress: cleanInput },
            { piUserId: cleanInput },
            { usdtAddress: cleanInput },
            { solAddress: cleanInput },
            { xrpAddress: cleanInput },
            { xlmAddress: cleanInput }
          ]
        }
      });

      // C. DÉBIT DE L'EXPÉDITEUR
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } }
      });

      // --- SCÉNARIO 1 : TRANSFERT INTERNE (ENTRE MEMBRES PIMPAY) ---
      if (recipientUser) {
        if (recipientUser.id === senderId) throw new Error("Vous ne pouvez pas vous envoyer des fonds à vous-même.");

        // Déterminer le type de wallet selon la monnaie
        const getWalletType = (curr: string): WalletType => {
          if (curr === "PI") return WalletType.PI;
          if (curr === "SDA") return WalletType.SIDRA;
          if (["XAF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
          return WalletType.CRYPTO;
        };

        // Crédit du destinataire (Upsert pour créer le wallet s'il n'existe pas encore)
        const toWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipientUser.id, currency } },
          update: { balance: { increment: amount } },
          create: {
            userId: recipientUser.id,
            currency,
            balance: amount,
            type: getWalletType(currency)
          }
        });

        // Log de transaction SUCCESS (Immédiat)
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            toUserId: recipientUser.id,
            fromWalletId: updatedSender.id,
            toWalletId: toWallet.id,
            description: `Transfert interne vers @${recipientUser.username || 'Membre'}`
          }
        });

        // Notification asynchrone pour le destinataire
        await tx.notification.create({
          data: {
            userId: recipientUser.id,
            title: "Fonds reçus ! 💸",
            message: `Vous avez reçu ${amount} ${currency} de la part d'un membre PimPay.`,
            type: "payment_received"
          }
        }).catch(() => {});

        return { type: 'INTERNAL', transaction };
      } 

      // --- SCÉNARIO 2 : RETRAIT EXTERNE (VERS BLOCKCHAIN) ---
      else {
        // Log de transaction PENDING (Le worker s'en chargera)
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.WITHDRAW, // On marque ça comme un retrait
            status: TransactionStatus.PENDING,
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description: `Retrait ${currency} vers adresse externe : ${recipientInput}`,
            metadata: {
              externalAddress: recipientInput,
              network: currency,
              isBlockchainWithdraw: true
            }
          }
        });

        return { type: 'EXTERNAL', transaction };
      }

    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      mode: result.type,
      message: result.type === 'INTERNAL' ? "Transfert instantané réussi" : "Retrait blockchain enregistré (en attente)",
      reference: result.transaction.reference
    });

  } catch (error: any) {
    console.error("[SEND_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
