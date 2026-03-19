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

    // Validation d'adresse selon la devise
    const validateAddress = (addr: string, curr: string): boolean => {
      if (!addr || addr.length < 3) return false;
      
      // Pi Network: adresse Stellar (G... 56 chars) OU piUserId
      if (curr === "PI") {
        return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3; // piUserId peut être court
      }
      
      // SDA/Sidra: adresse EVM (0x... 42 chars)
      if (curr === "SDA" || curr === "SIDRA") {
        return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      }
      
      // USDT TRC20: adresse TRON (T... 34 chars)
      if (curr === "USDT") {
        return /^T[a-zA-Z0-9]{33}$/.test(addr) || addr.length >= 3;
      }
      
      // Bitcoin: legacy/bech32
      if (curr === "BTC") {
        return /^[13bc1][a-km-zA-HJ-NP-Z1-9]{25,62}$/.test(addr) || addr.length >= 3;
      }
      
      // Ethereum & autres EVM
      if (["ETH", "BNB", "USDC", "DAI", "BUSD"].includes(curr)) {
        return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      }
      
      // Stellar/XLM
      if (curr === "XLM") {
        return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3;
      }
      
      // XRP
      if (curr === "XRP") {
        return /^r[a-zA-Z0-9]{24,33}$/.test(addr) || addr.length >= 3;
      }
      
      // Solana
      if (curr === "SOL") {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) || addr.length >= 3;
      }
      
      // Par défaut: accepter si c'est >= 3 caractères (username, email)
      return addr.length >= 3;
    };

    if (!validateAddress(recipientInput, currency)) {
      return NextResponse.json({ 
        error: `Adresse ${currency} invalide. Veuillez vérifier le format.` 
      }, { status: 400 });
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

      // Déterminer si c'est une adresse Stellar/Pi (commence par G, 56 chars)
      const isStellarAddress = /^G[A-Z2-7]{55}$/.test(cleanInput);
      // Déterminer si c'est une adresse EVM/SDA (commence par 0x, 42 chars)
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(cleanInput);

      const recipientUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanInput, mode: 'insensitive' } },
            { email: { equals: cleanInput, mode: 'insensitive' } },
            { sidraAddress: { equals: cleanInput, mode: 'insensitive' } },
            { walletAddress: { equals: cleanInput, mode: 'insensitive' } },
            { piUserId: { equals: cleanInput, mode: 'insensitive' } },
            { usdtAddress: { equals: cleanInput, mode: 'insensitive' } },
            { solAddress: { equals: cleanInput, mode: 'insensitive' } },
            { xrpAddress: { equals: cleanInput, mode: 'insensitive' } },
            { xlmAddress: { equals: cleanInput, mode: 'insensitive' } },
            ...(isStellarAddress ? [{ xlmAddress: cleanInput }] : []),
            ...(isEvmAddress ? [{ sidraAddress: cleanInput }] : [])
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
        // Log de transaction SUCCESS (statut temporaire, le worker le changera si erreur)
        // Le worker cherche les transactions WITHDRAW avec status SUCCESS et blockchainTx null
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.WITHDRAW, // On marque ça comme un retrait
            status: TransactionStatus.SUCCESS, // Worker cherche SUCCESS + blockchainTx null
            statusClass: "QUEUED", // Utilisé par le worker pour le claim atomique
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description: `Retrait ${currency} vers adresse externe : ${recipientInput}`,
            // IMPORTANT: Stocker l'adresse externe directement dans accountNumber pour l'affichage admin
            accountNumber: recipientInput,
            metadata: {
              externalAddress: recipientInput,
              network: currency,
              isBlockchainWithdraw: true,
              requestedAt: new Date().toISOString()
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
