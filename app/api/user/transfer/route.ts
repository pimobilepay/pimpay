export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';

// 1. Détection étendue des adresses selon l'image
function detectExternalAddress(identifier: string): { isExternal: boolean; network: string | null } {
  const clean = identifier.trim();
  
  if (/^G[A-Z2-7]{55}$/.test(clean)) return { isExternal: true, network: "PI_STELLAR" }; // Pi/XLM
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) return { isExternal: true, network: "EVM_NETWORK" }; // ETH/BNB/SOL/USDT/MATIC
  if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(clean)) return { isExternal: true, network: "BITCOIN" };
  if (clean.startsWith('T') && clean.length === 34) return { isExternal: true, network: "TRON_TRC20" }; // TRX/USDT-TRC20
  if (/^r[1-9A-HJ-NP-Za-km-z]{25,33}$/.test(clean)) return { isExternal: true, network: "RIPPLE" };
  if (clean.startsWith('addr1') || (clean.length === 58 && clean.startsWith('D'))) return { isExternal: true, network: "CARDANO_DOGE" };
  if (clean.length === 48 || clean.startsWith('EQ')) return { isExternal: true, network: "TONCOIN" };

  return { isExternal: false, network: null };
}

// 2. Mapping intelligent des WalletType selon votre schéma
function getWalletType(currency: string): WalletType {
  const c = currency.toUpperCase();
  if (c === "PI") return WalletType.PI;
  if (c === "SDA" || c === "SIDRA") return WalletType.SIDRA;
  if (["XAF", "USD", "EUR", "CDF"].includes(c)) return WalletType.FIAT;
  return WalletType.CRYPTO; // Pour BTC, ETH, USDT, etc.
}

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const token = (await cookies()).get("token")?.value || (await cookies()).get("pimpay_token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const { recipientIdentifier, amount, currency, description } = await req.json();

    const cleanIdentifier = recipientIdentifier.trim().replace(/^@/, '');
    const transferAmount = parseFloat(amount);
    const transferCurrency = (currency || "PI").toUpperCase();

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    const externalCheck = detectExternalAddress(cleanIdentifier);

    // ÉVITER LE TIMEOUT : Rechercher le destinataire AVANT d'ouvrir la transaction Prisma
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanIdentifier, mode: 'insensitive' } },
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
          { phone: cleanIdentifier },
          { walletAddress: cleanIdentifier },
          { sidraAddress: cleanIdentifier },
          { usdtAddress: cleanIdentifier },
          { xrpAddress: cleanIdentifier },
          { xlmAddress: cleanIdentifier }
        ]
      }
    });

    // EXECUTION DE LA TRANSACTION (SÉCURISÉE)
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Vérifier le solde de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde ${transferCurrency} insuffisant.`);
      }

      // --- CAS EXTERNE (RETRAIT BLOCKCHAIN) ---
      if (externalCheck.isExternal && !recipient) {
        await tx.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: transferAmount } }
        });

        return await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount: transferAmount,
            currency: transferCurrency,
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.PENDING,
            fromUserId: senderId,
            fromWalletId: senderWallet.id,
            description: description || `Retrait ${transferCurrency} vers ${externalCheck.network}`,
            metadata: { 
               externalAddress: cleanIdentifier, 
               network: externalCheck.network,
               isExternal: true 
            }
          }
        });
      }

      // --- CAS INTERNE (TRANSFERT PIMPAY) ---
      if (!recipient) throw new Error("Identifiant introuvable.");
      if (recipient.id === senderId) throw new Error("Impossible d'envoyer à soi-même.");

      // Débit
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // Crédit avec Upsert (Création auto du wallet si inexistant chez le destinataire)
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
        update: { balance: { increment: transferAmount } },
        create: {
          userId: recipient.id,
          currency: transferCurrency,
          balance: transferAmount,
          type: getWalletType(transferCurrency)
        }
      });

      return await tx.transaction.create({
        data: {
          reference: `PIM-TR-${nanoid(10).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
          description: description || `Transfert de ${senderWallet.currency} à ${recipient.username || 'Utilisateur'}`,
        }
      });
    }, {
      timeout: 20000 // Augmentation du timeout pour les connexions mobiles lentes
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("ERREUR TRANSFERT:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
