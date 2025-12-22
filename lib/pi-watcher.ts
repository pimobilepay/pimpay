import { prisma } from "@/lib/prisma";

// Configuration de l'API Horizon de Pi
// Testnet: https://api.testnet.minepi.com | Mainnet: https://api.mainnet.minepi.com
const PI_HORIZON_URL = "https://api.mainnet.minepi.com"; 

export async function watchDeposit(paymentId: string) {
  try {
    // 1. Appeler l'API Pi pour vérifier le statut du paiement
    const response = await fetch(`${PI_HORIZON_URL}/payments/${paymentId}`);
    
    if (!response.ok) {
        return { success: false, message: "Impossible de vérifier le paiement sur la blockchain" };
    }

    const paymentData = await response.json();

    // 2. Vérifications de sécurité critiques
    // On vérifie que le paiement est bien marqué comme COMPLETED sur la blockchain
    if (paymentData.status !== "COMPLETED") {
        return { success: false, message: "Paiement non complété sur la blockchain" };
    }

    // Vérifier que le destinataire est bien TON Master Wallet (configuré dans ton .env)
    if (paymentData.recipient !== process.env.PI_MASTER_WALLET_ADDRESS) {
      return { success: false, message: "Destinataire invalide : ce paiement n'était pas pour PiMPay" };
    }

    // 3. Récupérer le wallet de l'utilisateur grâce au Mémo (Identifiant unique)
    const memo = paymentData.memo;
    const wallet = await prisma.wallet.findUnique({
      where: { depositMemo: memo },
    });

    if (!wallet) {
        return { success: false, message: "Mémo inconnu : impossible d'attribuer ce dépôt" };
    }

    // 4. TRANSACTION ATOMIQUE : Sécurité maximale
    // On groupe les 3 opérations : Mise à jour solde + Historique + Notification
    await prisma.$transaction([
      // A. Créditer les Pi sur le solde custodial
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { 
            balance: { increment: parseFloat(paymentData.amount) } 
        }
      }),
      
      // B. Créer l'entrée dans l'historique des transactions
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: parseFloat(paymentData.amount),
          status: "COMPLETED",
          reference: paymentId // L'ID de transaction unique pour éviter les doubles dépôts
        }
      }),

      // C. Créer la notification pour l'utilisateur
      prisma.notification.create({
        data: {
          userId: wallet.userId,
          title: "Dépôt Confirmé ! 🚀",
          message: `Votre compte PiMPay a été crédité de ${paymentData.amount} π.`,
          type: "DEPOSIT",
          read: false
        }
      })
    ]);

    return { 
        success: true, 
        amount: paymentData.amount,
        message: "Solde mis à jour et notification envoyée" 
    };

  } catch (error) {
    console.error("Erreur critique dans le Watcher Pi:", error);
    return { success: false, message: "Erreur serveur lors de la validation" };
  }
}
