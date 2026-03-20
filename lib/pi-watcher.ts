import { prisma } from "@/lib/prisma";

// Utilise l'URL Horizon depuis les variables d'environnement (testnet ou mainnet)
const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.testnet.minepi.com";

export async function watchDeposit(paymentId: string) {
  try {
    // 1. Vérification blockchain
    const response = await fetch(`${PI_HORIZON_URL}/payments/${paymentId}`);
    if (!response.ok) return { success: false, message: "Paiement introuvable sur Horizon" };

    const paymentData = await response.json();

    // 2. Sécurité : Status et Destinataire
    if (paymentData.status !== "SUCCESS") {
        return { success: false, message: "Paiement non finalisé sur la blockchain" };
    }

    if (paymentData.recipient !== process.env.PI_MASTER_WALLET_ADDRESS) {
      return { success: false, message: "Ce paiement n'est pas destiné au Master Wallet Pimpay" };
    }

    // 3. Recherche du Wallet (Possibilité 1: par Memo | Possibilité 2: par userId si le memo est l'UID)
    const memo = paymentData.memo;
    const wallet = await prisma.wallet.findFirst({
      where: {
        OR: [
          { depositMemo: memo },
          { user: { piUserId: memo } } // Si l'UID est utilisé comme mémo
        ]
      },
      include: { user: true }
    });

    if (!wallet) {
        return { success: false, message: "Référence de dépôt (memo) inconnue" };
    }

    // 4. TRANSACTION ATOMIQUE (Adaptée à ton schéma)
    await prisma.$transaction([
      // A. Créditer le compte
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: parseFloat(paymentData.amount) } }
      }),

      // B. Créer la transaction Ledger
      prisma.transaction.create({
        data: {
          reference: paymentId,
          amount: parseFloat(paymentData.amount),
          currency: "PI",
          type: "DEPOSIT",
          status: "SUCCESS", // Selon ton Enum TransactionStatus
          toUserId: wallet.userId,
          toWalletId: wallet.id,
          description: `Dépôt Blockchain Pi - Memo: ${memo}`,
        }
      }),

      // C. Notification système
      prisma.notification.create({
        data: {
          userId: wallet.userId,
          title: "Dépôt Confirmé ! 🚀",
          message: `Votre compte Pimpay a été crédité de ${paymentData.amount} π.`,
          type: "info", // Valeur par défaut de ton schéma
        }
      })
    ]);

    return {
        success: true,
        amount: paymentData.amount,
        username: wallet.user?.username
    };

  } catch (error) {
    console.error("CRITICAL WATCHER ERROR:", error);
    return { success: false, message: "Erreur interne de validation" };
  }
}
