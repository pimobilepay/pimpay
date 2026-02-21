export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';

function detectExternalAddress(identifier: string): { isExternal: boolean; network: string | null } {
  const isPiAddress = /^G[A-Z2-7]{55}$/.test(identifier); 
  const isEVM = /^0x[a-fA-F0-9]{40}$/.test(identifier);
  const isTron = identifier.startsWith('T') && identifier.length === 34;

  if (isPiAddress) return { isExternal: true, network: "PI" };
  if (isEVM) return { isExternal: true, network: "EVM" };
  if (isTron) return { isExternal: true, network: "USDT" };
  return { isExternal: false, network: null };
}

// Utilitaire pour définir le type de wallet selon la monnaie
function getWalletType(currency: string): WalletType {
  if (currency === "PI") return WalletType.PI;
  if (currency === "SDA") return WalletType.SIDRA;
  if (["XAF", "USD", "EUR", "CDF"].includes(currency)) return WalletType.FIAT;
  return WalletType.CRYPTO;
}

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

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

    const externalCheck = detectExternalAddress(cleanIdentifier);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Vérification stricte du portefeuille expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde insuffisant (${senderWallet?.balance || 0} ${transferCurrency}).`);
      }

      // 2. Recherche du destinataire (Username, Email, Phone ou Adresse)
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { walletAddress: cleanIdentifier },
            { phone: cleanIdentifier },
            { piUserId: cleanIdentifier },
            { sidraAddress: cleanIdentifier }
          ]
        }
      });

      // --- CAS 1 : TRANSFERT EXTERNE ---
      if (!recipient && externalCheck.isExternal) {
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
            description: description || `Transfert ${externalCheck.network} externe`,
            metadata: { externalAddress: cleanIdentifier, network: externalCheck.network }
          }
        });
      }

      // --- CAS 2 : TRANSFERT INTERNE PIMPAY ---
      if (!recipient) throw new Error("Destinataire introuvable.");
      if (recipient.id === senderId) throw new Error("Envoi vers soi-même impossible.");

      // A. Débit Expéditeur
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // B. Crédit Destinataire (Sécurisé : Trouve ou Crée)
      let recipientWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: recipient.id, currency: transferCurrency } }
      });

      if (!recipientWallet) {
        recipientWallet = await tx.wallet.create({
          data: {
            userId: recipient.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: getWalletType(transferCurrency)
          }
        });
      } else {
        recipientWallet = await tx.wallet.update({
          where: { id: recipientWallet.id },
          data: { balance: { increment: transferAmount } }
        });
      }

      // C. Création du Log de Transaction final
      return await tx.transaction.create({
        data: {
          reference: `PIM-TR-${nanoid(10).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: updatedSender.id,
          toUserId: recipient.id,
          toWalletId: recipientWallet.id,
          description: description || `Transfert à ${recipient.username || recipient.email}`,
          metadata: { internal: true }
        }
      });
    }, {
      timeout: 20000,
      isolationLevel: "Serializable" // Protection maximale contre la double dépense
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("ERREUR TRANSFERT:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
