export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

// Helper: detect external crypto addresses
function detectExternalAddress(identifier: string): { isExternal: boolean; network: string | null } {
  const isPiAddress = /^G[A-Z2-7]{55}$/.test(identifier);
  const isSdaOrEth = /^0x[a-fA-F0-9]{40}$/.test(identifier);
  const isTron = identifier.startsWith('T') && identifier.length === 34;

  if (isPiAddress) return { isExternal: true, network: "PI" };
  if (isSdaOrEth) return { isExternal: true, network: "SDA" };
  if (isTron) return { isExternal: true, network: "USDT" };
  return { isExternal: false, network: null };
}

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();
    let { recipientIdentifier, amount, currency, description } = body;

    const cleanIdentifier = recipientIdentifier.startsWith('@') ? recipientIdentifier.substring(1) : recipientIdentifier;
    const transferAmount = parseFloat(amount);
    const transferCurrency = (currency || "XAF").toUpperCase();

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    // Detect if this is an external address (Pi Network, SDA, USDT/TRC20)
    const externalCheck = detectExternalAddress(cleanIdentifier);

    // --- TRANSACTION ATOMIQUE ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. WALLET DE L'EXPEDITEUR
      const senderWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } },
        update: {},
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

      // 2. IDENTIFIER LE DESTINATAIRE (interne ou externe)
      let recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { walletAddress: cleanIdentifier },
            { sidraAddress: cleanIdentifier },
            { usdtAddress: cleanIdentifier },
            { xlmAddress: cleanIdentifier },
            { xrpAddress: cleanIdentifier },
            { phone: cleanIdentifier }
          ]
        }
      });

      // --- TRANSFERT EXTERNE (Pi Network, SDA, USDT etc.) ---
      if (!recipient && externalCheck.isExternal) {
        // Debit sender wallet
        await tx.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: transferAmount } }
        });

        // Create a PENDING transaction for external withdrawal
        return await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            amount: transferAmount,
            currency: transferCurrency,
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.PENDING,
            fromUserId: senderId,
            fromWalletId: senderWallet.id,
            description: description || `Transfert externe vers ${cleanIdentifier.slice(0, 8)}...${cleanIdentifier.slice(-6)}`,
            metadata: {
              externalAddress: cleanIdentifier,
              network: externalCheck.network,
              isExternalTransfer: true,
            }
          }
        });
      }

      // --- TRANSFERT INTERNE ---
      if (!recipient) throw new Error("Destinataire introuvable dans PimPay.");
      if (recipient.id === senderId) throw new Error("Impossible de s'envoyer a soi-meme.");

      // 3. MISE A JOUR DES SOLDES (Debit / Credit)
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

      // 4. CREATION DE LA TRANSACTION (SUCCESS pour le graphique)
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
    console.error("Erreur Transfert:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
