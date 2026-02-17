export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

// Configurations des RPC
const RPC_CONFIGS: Record<string, string> = {
  SDA: "https://rpc.sidrachain.com",
  USDC: process.env.POLYGON_RPC || "https://polygon-rpc.com", // Exemple sur Polygon
  BUSD: "https://bsc-dataseed.binance.org",
  DAI: "https://eth-mainnet.public.blastapi.io",
};

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

    // --- LOGIQUE DE DÉTECTION DES RÉSEAUX ---
    const isEVMAddress = cleanIdentifier.startsWith('0x') && cleanIdentifier.length === 42;
    const isXRPAddress = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(cleanIdentifier);
    const isXLMAddress = /^G[A-Z2-7]{55}$/.test(cleanIdentifier);
    const isPiAddress = isXLMAddress; // Pi utilise le format Stellar (XLM)

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    // --- VÉRIFICATION DE DISPONIBILITÉ RÉSEAU (Pour les cryptos EVM) ---
    if (isEVMAddress && RPC_CONFIGS[transferCurrency]) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await fetch(RPC_CONFIGS[transferCurrency], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (e) {
        throw new Error(`Le réseau ${transferCurrency} est injoignable. Réessayez plus tard.`);
      }
    }

    // --- TRANSACTION ATOMIQUE PIMPAY ---
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde insuffisant en ${transferCurrency}.`);
      }

      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error("Expéditeur introuvable.");

      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { sidraAddress: cleanIdentifier },
            { walletAddress: cleanIdentifier },
            { phone: cleanIdentifier }
          ]
        }
      });

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // Débit préventif (Rollback automatique si erreur)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // --- CAS 1 : BLOCKCHAIN EXTERNE (EVM: SDA, USDC, BUSD, DAI) ---
      if (isEVMAddress && RPC_CONFIGS[transferCurrency]) {
        if (!sender.walletPrivateKey) throw new Error(`Clé privée manquante pour ${transferCurrency}.`);
        
        try {
          const provider = new ethers.JsonRpcProvider(RPC_CONFIGS[transferCurrency]);
          const wallet = new ethers.Wallet(sender.walletPrivateKey, provider);
          
          // Note: Pour les tokens (USDC/BUSD), il faudrait utiliser un contrat Interface. 
          // Ici, on gère l'envoi de la monnaie native du réseau configuré.
          const val = ethers.parseEther(amount.toString());
          const blockchainTx = await wallet.sendTransaction({ to: cleanIdentifier, value: val });
          txHash = blockchainTx.hash;
        } catch (err: any) {
          throw new Error(`Erreur Blockchain ${transferCurrency}: ${err.message}`);
        }
      } 
      
      // --- CAS 2 : BLOCKCHAIN EXTERNE (NON-EVM: XRP, XLM, PI) ---
      else if ((isXRPAddress && transferCurrency === "XRP") || (isXLMAddress && (transferCurrency === "XLM" || transferCurrency === "PI"))) {
        // Enregistrement pour traitement par le bridge PimPay (Node.js worker dédié)
        txHash = `${transferCurrency}-EXT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      // --- CAS 3 : TRANSFERT INTERNE PIMPAY ---
      else if (recipient) {
        toUserId = recipient.id;
        const recipientWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
          update: { balance: { increment: transferAmount } },
          create: {
            userId: recipient.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: WalletType.CRYPTO // On généralise le type
          }
        });
        toWalletId = recipientWallet.id;

        await tx.notification.create({
          data: {
            userId: recipient.id,
            title: "Paiement reçu",
            message: `${transferAmount} ${transferCurrency} de @${sender.username}`,
            type: "PAYMENT_RECEIVED"
          }
        });
      } else {
        throw new Error("Format d'adresse ou destinataire inconnu.");
      }

      return await tx.transaction.create({
        data: {
          reference: `PIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: toUserId,
          toWalletId: toWalletId,
          blockchainTx: txHash,
          description: description || `Transfert ${transferCurrency}`
        }
      });
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
