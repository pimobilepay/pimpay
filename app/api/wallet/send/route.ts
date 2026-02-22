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
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let senderId: string | null = null;

    // 1. AUTHENTIFICATION BLINDÉE
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
    const transferAmount = parseFloat(body.amount);
    const transferCurrency = (body.currency || "SDA").toUpperCase();
    const recipientIdentifier = (body.recipientIdentifier || body.address || body.to || "").trim();

    if (!recipientIdentifier || isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 2. LOGIQUE DE TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Vérifier l'expéditeur et son solde
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId!, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde ${transferCurrency} insuffisant.`);
      }

      // B. Identifier si c'est un transfert INTERNE (PimPay) ou EXTERNE (Blockchain)
      const cleanId = recipientIdentifier.startsWith('@') ? recipientIdentifier.substring(1) : recipientIdentifier;
      
      const recipientUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: cleanId, mode: 'insensitive' } },
            { sidraAddress: cleanId },
            { walletAddress: cleanId },
            { usdtAddress: cleanId }
          ]
        }
      });

      // C. DÉBIT DE L'EXPÉDITEUR (Toujours en premier)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // --- CAS 1 : TRANSFERT INTERNE (ENTRE MEMBRES) ---
      if (recipientUser) {
        if (recipientUser.id === senderId) throw new Error("Auto-transfert interdit.");

        const toWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipientUser.id, currency: transferCurrency } },
          update: { balance: { increment: transferAmount } },
          create: {
            userId: recipientUser.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: transferCurrency === "PI" ? WalletType.PI : transferCurrency === "SDA" ? WalletType.SIDRA : WalletType.CRYPTO
          }
        });

        // Notification de réception
        await tx.notification.create({
          data: {
            userId: recipientUser.id,
            title: "Paiement reçu 📥",
            message: `Vous avez reçu ${transferAmount} ${transferCurrency}.`,
            type: "SUCCESS"
          }
        });

        return await tx.transaction.create({
          data: {
            reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
            amount: transferAmount,
            currency: transferCurrency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            toUserId: recipientUser.id,
            fromWalletId: senderWallet.id,
            toWalletId: toWallet.id,
            description: `Transfert interne vers @${recipientUser.username || 'Membre'}`
          }
        });
      } 
      
      // --- CAS 2 : TRANSFERT EXTERNE (VERS BLOCKCHAIN) ---
      else {
        // On crée une transaction PENDING. Le Worker prendra le relais.
        return await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount: transferAmount,
            currency: transferCurrency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.PENDING,
            fromUserId: senderId,
            fromWalletId: senderWallet.id,
            description: `Retrait ${transferCurrency} vers adresse externe`,
            metadata: {
              isExternal: true,
              recipientAddress: recipientIdentifier,
              network: transferCurrency
            }
          }
        });
      }
    }, { timeout: 20000 });

    return NextResponse.json({ 
      success: true, 
      message: result.status === "SUCCESS" ? "Transfert réussi" : "Transfert mis en attente (Blockchain)",
      transaction: result 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
