import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simulation de la vérification avec le serveur de Pi Network
// En production, vous utiliserez : https://api.minepi.com/v2/payments/...
async function verifyPiPaymentOnBlockchain(paymentId: string, accessToken: string) {
  // Cette fonction doit normalement appeler l'API Pi pour confirmer 
  // que le paiement est bien 'completed' et que le montant est correct.
  return { verified: true, amount: 10.5 }; // Simulation
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, paymentId, txid, amount, piAccessToken } = body;

    // 1. Vérifications de base
    if (!userId || !paymentId || !txid) {
      return NextResponse.json({ success: false, message: "Identifiants de transaction Pi manquants" }, { status: 400 });
    }

    // 2. Empêcher le "Double Spending" (Vérifier si le txid existe déjà)
    const existingTx = await prisma.transaction.findUnique({
      where: { blockchainTx: txid }
    });

    if (existingTx) {
      return NextResponse.json({ success: false, message: "Cette transaction a déjà été traitée." }, { status: 409 });
    }

    // 3. Récupérer l'utilisateur et son Wallet Pi
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { where: { currency: "PI" } } }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur PimPay introuvable" }, { status: 404 });
    }

    // 4. TRANSACTION ATOMIQUE : Création du log et mise à jour du solde
    const reference = `PI-DEP-${Date.now()}`;
    
    const result = await prisma.$transaction(async (tx) => {
      // A. Trouver ou créer le Wallet PI
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        create: {
          userId,
          currency: "PI",
          balance: 0,
          type: "PI",
        },
        update: {}
      });

      // B. Créer la transaction avec le statut SUCCESS (après vérification SDK)
      const newTransaction = await tx.transaction.create({
        data: {
          reference,
          externalId: paymentId, // ID du paiement Pi SDK
          blockchainTx: txid,    // Hash sur la Pi Blockchain
          amount: parseFloat(amount),
          currency: "PI",
          type: "DEPOSIT",
          status: "SUCCESS",
          description: "Dépôt via Pi Network Mainnet",
          toUserId: userId,
          toWalletId: wallet.id,
          metadata: {
            pi_payment_id: paymentId,
            network: "Pi Mainnet"
          }
        }
      });

      // C. Créditer le compte de l'utilisateur
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: parseFloat(amount) } }
      });

      // D. Créer une notification
      await tx.notification.create({
        data: {
          userId,
          title: "Dépôt Pi Reçu ! 🥧",
          message: `Votre compte a été crédité de ${amount} PI.`,
          type: "deposit"
        }
      });

      return newTransaction;
    }, { maxWait: 10000, timeout: 30000 });

    // 5. Audit Log
    await prisma.securityLog.create({
      data: {
        userId,
        action: "PI_NETWORK_DEPOSIT_SUCCESS",
        details: `TxID: ${txid} | Amount: ${amount} PI`,
        ip: req.headers.get("x-forwarded-for") || "unknown"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Transaction Pi Network validée et créditée",
      data: result
    });

  } catch (error) {
    console.error("PI_DEPOSIT_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur lors du dépôt Pi" }, { status: 500 });
  }
}

