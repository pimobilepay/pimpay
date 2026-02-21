export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';

// Détection étendue des adresses externes
function detectExternalAddress(identifier: string): { isExternal: boolean; network: string | null } {
  const isPiAddress = /^G[A-Z2-7]{55}$/.test(identifier); // Pi / Stellar
  const isEVM = /^0x[a-fA-F0-9]{40}$/.test(identifier); // ETH, BNB, SIDRA, Polygon
  const isTron = identifier.startsWith('T') && identifier.length === 34; // USDT (TRC20)
  const isBTC = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(identifier); // Bitcoin
  const isXRP = /^r[1-9A-HJ-NP-Za-km-z]{25,33}$/.test(identifier); // Ripple

  if (isPiAddress) return { isExternal: true, network: "PI_STELLAR" };
  if (isEVM) return { isExternal: true, network: "EVM_NETWORK" }; // Couvre USDC, BUSD, DAI, SIDRA
  if (isTron) return { isExternal: true, network: "TRON_USDT" };
  if (isBTC) return { isExternal: true, network: "BITCOIN" };
  if (isXRP) return { isExternal: true, network: "XRP_LEDGER" };
  
  return { isExternal: false, network: null };
}

// Classification selon ton Enum WalletType
function getWalletType(currency: string): WalletType {
  const c = currency.toUpperCase();
  if (c === "PI") return WalletType.PI;
  if (c === "SDA" || c === "SIDRA") return WalletType.SIDRA;
  if (["XAF", "USD", "EUR", "CDF"].includes(c)) return WalletType.FIAT;
  // Toutes les autres cryptos demandées (BTC, USDT, USDC, BUSD, DAI, XRP, XLM)
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
      // 1. Vérification du solde expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde insuffisant (${senderWallet?.balance || 0} ${transferCurrency}).`);
      }

      // 2. Recherche du destinataire (Interne PimPay)
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { phone: cleanIdentifier },
            { walletAddress: cleanIdentifier }, // BTC / PI
            { sidraAddress: cleanIdentifier },  // SIDRA / EVM
            { usdtAddress: cleanIdentifier },   // TRC20
            { xrpAddress: cleanIdentifier },    // XRP
            { xlmAddress: cleanIdentifier }     // XLM
          ]
        }
      });

      // --- CAS 1 : TRANSFERT VERS UNE ADRESSE EXTERNE (Blockchain) ---
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
            status: TransactionStatus.PENDING, // En attente de validation/envoi par le worker
            fromUserId: senderId,
            fromWalletId: senderWallet.id,
            description: description || `Retrait ${transferCurrency} vers réseau ${externalCheck.network}`,
            metadata: { 
                externalAddress: cleanIdentifier, 
                network: externalCheck.network,
                isBlockchain: true 
            }
          }
        });
      }

      // --- CAS 2 : TRANSFERT INTERNE PIMPAY ---
      if (!recipient) throw new Error("Destinataire introuvable sur PimPay.");
      if (recipient.id === senderId) throw new Error("Envoi vers soi-même impossible.");

      // A. Débit Expéditeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // B. Crédit Destinataire (Trouve ou Crée le portefeuille de la devise)
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

      // C. Création du Log final
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
          description: description || `Transfert ${transferCurrency} vers ${recipient.username || 'utilisateur'}`,
          metadata: { internal: true }
        }
      });
    }, {
      timeout: 25000,
      isolationLevel: "Serializable"
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("ERREUR TRANSFERT PIMPAY:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
