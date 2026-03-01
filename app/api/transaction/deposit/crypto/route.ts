import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userId, 
      amount, 
      currency, // "PI", "SIDRA", "USDT"
      blockchainTx, // Le hash de la transaction reçu du SDK
      memo 
    } = body;

    // 1. Validation des données entrantes
    if (!userId || !amount || !blockchainTx || !currency) {
      return NextResponse.json({ success: false, message: "Données incomplètes" }, { status: 400 });
    }

    // 2. Vérification de l'existence de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable" }, { status: 404 });
    }

    // 3. Vérifier si cette transaction blockchain n'a pas déjà été traitée
    const existingTx = await prisma.transaction.findUnique({
      where: { blockchainTx: blockchainTx }
    });

    if (existingTx) {
      return NextResponse.json({ success: false, message: "Cette transaction a déjà été créditée" }, { status: 400 });
    }

    // 4. Calcul du montant équivalent en monnaie fiduciaire (Optionnel selon ton business model)
    // Ici on enregistre la transaction crypto directement
    const reference = `CRYPTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 5. Exécution de la transaction Atomique (Dépôt + Mise à jour solde)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Trouver ou créer le Wallet Crypto correspondant
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency } },
        update: {},
        create: {
          userId,
          currency,
          balance: 0,
          type: currency === "PI" ? "PI" : "CRYPTO"
        }
      });

      // B. Créer la transaction PimPay
      const newTransaction = await tx.transaction.create({
        data: {
          reference,
          blockchainTx,
          amount: parseFloat(amount),
          currency,
          type: "DEPOSIT",
          status: "SUCCESS", // On marque SUCCESS car le hash blockchain est fourni
          description: `Dépôt Crypto ${currency} - Réseau ${currency === "PI" ? "Pi Network" : "Mainnet"}`,
          toUserId: userId,
          toWalletId: wallet.id,
          metadata: { memo, processedAt: new Date().toISOString() }
        }
      });

      // C. Créditer le solde du Wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: parseFloat(amount) } }
      });

      // D. Notifier l'utilisateur
      await tx.notification.create({
        data: {
          userId,
          title: "Actif Crypto Reçu 🚀",
          message: `Votre dépôt de ${amount} ${currency} a été confirmé sur la blockchain.`,
          type: "CRYPTO_DEPOSIT"
        }
      });

      return { newTransaction, updatedWallet };
    }, { maxWait: 10000, timeout: 30000 });

    // 6. Log d'audit de sécurité
    await prisma.securityLog.create({
      data: {
        userId,
        action: "CRYPTO_DEPOSIT_COMPLETED",
        details: `TX: ${blockchainTx} | Amount: ${amount} ${currency}`,
        ip: req.headers.get("x-forwarded-for") || "unknown"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Portefeuille crédité avec succès",
      data: result.newTransaction
    });

  } catch (error) {
    console.error("CRYPTO_DEPOSIT_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur lors du traitement du dépôt crypto" }, { status: 500 });
  }
}
