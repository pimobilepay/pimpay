export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
// Import direct des enums générés par ton schéma
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

const RPC_CONFIGS: Record<string, string> = {
  SDA: "https://node.sidrachain.com", // Ton RPC Sidra
  USDC: "https://polygon-rpc.com",
  BUSD: "https://bsc-dataseed.binance.org",
  DAI: "https://eth-mainnet.public.blastapi.io",
};

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const cookieStore = await cookies();
    // Correction du nom du cookie pour correspondre à ton système d'authentification
    const token = cookieStore.get("token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();
    let { recipientIdentifier, amount, currency, description } = body;

    const cleanIdentifier = recipientIdentifier.startsWith('@') ? recipientIdentifier.substring(1) : recipientIdentifier;
    const transferAmount = parseFloat(amount);
    const transferCurrency = (currency || "XAF").toUpperCase();

    const isEVMAddress = cleanIdentifier.startsWith('0x') && cleanIdentifier.length === 42;

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    // --- TRANSACTION ATOMIQUE PIMPAY ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver le wallet source unique (grâce à @@unique[userId, currency])
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error(`Solde insuffisant en ${transferCurrency}.`);
      }

      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error("Expéditeur introuvable.");

      // 2. Identifier le destinataire (Interne ou Externe)
      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { sidraAddress: cleanIdentifier },
            { walletAddress: cleanIdentifier }
          ]
        }
      });

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // --- CAS 1 : TRANSFERT BLOCKCHAIN RÉEL (SDA / EVM) ---
      if (isEVMAddress && RPC_CONFIGS[transferCurrency]) {
        // Sélection de la clé privée spécifique selon le schéma
        const privateKey = transferCurrency === "SDA" ? sender.sidraPrivateKey : sender.walletPrivateKey;
        
        if (!privateKey) throw new Error(`Configuration blockchain manquante pour ${transferCurrency}.`);

        try {
          const provider = new ethers.JsonRpcProvider(RPC_CONFIGS[transferCurrency]);
          const wallet = new ethers.Wallet(privateKey, provider);
          
          // Vérification du gaz réel sur la blockchain
          const gasBalance = await provider.getBalance(wallet.address);
          if (gasBalance === 0n) throw new Error("Frais de gaz (SDA) insuffisants sur votre adresse.");

          const val = ethers.parseEther(amount.toString());
          const blockchainTx = await wallet.sendTransaction({ to: cleanIdentifier, value: val });
          txHash = blockchainTx.hash;
        } catch (err: any) {
          throw new Error(`Erreur Blockchain: ${err.message}`);
        }
      }

      // --- CAS 2 : TRANSFERT INTERNE PIMPAY ---
      if (recipient) {
        toUserId = recipient.id;
        // Déterminer le type de wallet selon la devise (Enum WalletType)
        let walletType = WalletType.FIAT;
        if (transferCurrency === "SDA") walletType = WalletType.SIDRA;
        else if (transferCurrency === "PI") walletType = WalletType.PI;
        else if (["USDT", "USDC", "BTC"].includes(transferCurrency)) walletType = WalletType.CRYPTO;

        const recipientWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipient.id, currency: transferCurrency } },
          update: { balance: { increment: transferAmount } },
          create: {
            userId: recipient.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: walletType
          }
        });
        toWalletId = recipientWallet.id;
      }

      // 3. Mise à jour des soldes et création du log
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      return await tx.transaction.create({
        data: {
          reference: `PIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          amount: transferAmount,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS, // Utilisation de l'Enum correct
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: toUserId,
          toWalletId: toWalletId,
          blockchainTx: txHash,
          description: description || `Transfert ${transferCurrency}`,
          metadata: { method: isEVMAddress ? "blockchain" : "internal" }
        }
      });
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("Erreur Transfert:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
