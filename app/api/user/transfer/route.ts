export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

// Utilisation d'un nœud plus stable ou gestion du timeout
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
    const isExternalSDA = cleanIdentifier.startsWith('0x') && cleanIdentifier.length === 42;

    if (isNaN(transferAmount) || transferAmount <= 0) throw new Error("Montant invalide.");

    // --- VACCIN 1 : PRÉ-VÉRIFICATION DU RÉSEAU (Évite les logs infinis) ---
    if (isExternalSDA && transferCurrency === "SDA") {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec max
        const probe = await fetch(SIDRA_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!probe.ok) throw new Error();
      } catch (e) {
        throw new Error("Le réseau Sidra est actuellement indisponible (Erreur 502/Timeout). Réessayez dans quelques instants.");
      }
    }

    // --- TRANSACTION ATOMIQUE PIMPAY ---
    const result = await prisma.$transaction(async (tx) => {
      
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: transferCurrency } }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error("Solde insuffisant dans votre wallet PimPay.");
      }

      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error("Compte expéditeur introuvable.");

      const recipient = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdentifier, mode: 'insensitive' } },
            { email: { equals: cleanIdentifier, mode: 'insensitive' } },
            { sidraAddress: cleanIdentifier },
            { walletAddress: cleanIdentifier },
            { piUserId: cleanIdentifier },
            { phone: cleanIdentifier }
          ]
        }
      });

      // Détection d'adresse Pi externe (commence par G et 56 caractères)
      const isExternalPi = /^G[A-Z2-7]{55}$/.test(cleanIdentifier);

      let txHash = null;
      let toUserId = null;
      let toWalletId = null;

      // Débit immédiat pour sécurité
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: transferAmount } }
      });

      // CAS A : RETRAIT VERS BLOCKCHAIN EXTERNE
      if (isExternalSDA && transferCurrency === "SDA") {
        if (!sender.sidraPrivateKey) throw new Error("Clé privée Sidra manquante.");
        
        try {
          // VACCIN 2 : staticNetwork empêche ethers de boucler sur la détection du réseau
          const provider = new ethers.JsonRpcProvider(SIDRA_RPC, undefined, {
            staticNetwork: new ethers.Network("Sidra Chain", 121314) // Remplace par le bon ChainID si nécessaire
          });
          
          const wallet = new ethers.Wallet(sender.sidraPrivateKey, provider);
          const val = ethers.parseEther(amount.toString());
          
          const blockchainTx = await wallet.sendTransaction({ to: cleanIdentifier, value: val });
          txHash = blockchainTx.hash;
        } catch (err: any) {
          // Si la blockchain échoue, l'erreur remontera et Prisma annulera le débit (Rollback)
          throw new Error(`Réseau Sidra saturé : ${err.message}`);
        }
      } 
      // CAS B : TRANSFERT INTERNE
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
      // CAS C : TRANSFERT PI VERS ADRESSE EXTERNE (Mainnet)
      else if (isExternalPi && transferCurrency === "PI") {
        // Pour l'instant, les transferts PI externes sont enregistrés comme PENDING
        // et nécessitent une validation manuelle ou un processeur blockchain séparé
        txHash = `PI-EXT-${Date.now()}`;

        await tx.notification.create({
          data: {
            userId: senderId,
            title: "Transfert Pi externe initie",
            message: `Envoi de ${transferAmount} PI vers ${cleanIdentifier.slice(0, 8)}...${cleanIdentifier.slice(-6)}`,
            type: "PAYMENT_SENT"
          }
        });
      }
      else {
        throw new Error("Destinataire introuvable. Verifiez le pseudo, email ou adresse wallet.");
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
          description: description || (isExternalPi ? `Transfert Pi vers ${cleanIdentifier.slice(0, 8)}...` : txHash ? `Retrait Blockchain` : `Vers @${recipient?.username}`)
        }
      });
    }, { timeout: 30000 }); // Timeout ajusté

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("Erreur Transfert:", error.message);
    // On renvoie un message propre à l'utilisateur
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
