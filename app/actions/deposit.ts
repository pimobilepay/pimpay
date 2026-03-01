"use server";

import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const MTN_CONFIG = {
  baseUrl: process.env.MTN_BASE_URL || "https://proxy.momoapi.mtn.com",
  subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY || "",
  apiUser: process.env.MTN_API_USER || "",
  apiKey: process.env.MTN_API_KEY || "",
  targetEnv: process.env.MTN_TARGET_ENV || "mtnuganda",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processDeposit(formData: {
  amount: number;
  method: string;
  phone: string;
  currency: string;
  userId: string; // Ajout de l'ID utilisateur pour la précision
}) {
  const mtnReferenceId = uuidv4();
  const pimpayReference = `PIM-DEP-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;

  try {
    // 1. Récupérer l'utilisateur et son Wallet USD
    const user = await prisma.user.findUnique({
      where: { id: formData.userId },
      include: { wallets: { where: { currency: "USD" } } }
    });

    if (!user) return { success: false, error: "Utilisateur introuvable." };

    // Vérifier si le wallet USD existe, sinon le créer (Sécurité PimPay)
    let wallet = user.wallets[0];
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          currency: "USD",
          balance: 0,
        }
      });
    }

    // --- LOGIQUE MTN ---
    if (formData.method.toLowerCase().includes("mtn")) {
      try {
        const authHeader = Buffer.from(`${MTN_CONFIG.apiUser}:${MTN_CONFIG.apiKey}`).toString('base64');
        const tokenRes = await fetch(`${MTN_CONFIG.baseUrl}/collection/token/`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey
          },
          cache: 'no-store'
        });

        if (!tokenRes.ok) throw new Error("Échec Auth MTN");
        const { access_token } = await tokenRes.json();

        const mtnRes = await fetch(`${MTN_CONFIG.baseUrl}/collection/v1_0/requesttopay`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-Reference-Id': mtnReferenceId,
            'X-Target-Environment': MTN_CONFIG.targetEnv,
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey
          },
          body: JSON.stringify({
            amount: formData.amount.toString(),
            currency: "USD", 
            externalId: pimpayReference,
            payer: {
              partyIdType: "MSISDN",
              partyId: formData.phone.replace('+', '').trim()
            },
            payerMessage: `PimPay Deposit: ${formData.amount} USD`,
            payeeNote: "PimPay Core Protocol"
          })
        });

        if (mtnRes.status !== 202) throw new Error("Transaction refusée par le gateway");
        await sleep(2000);

      } catch (mtnError: any) {
        console.error("❌ MTN Gateway Error:", mtnError.message);
        return { success: false, error: "L'opérateur n'a pas pu initier le paiement." };
      }
    }

    // --- ENREGISTREMENT TRANSACTION & NOTIFICATION ---
    const result = await prisma.$transaction(async (tx) => {
      // A. Créer la transaction
      const txn = await tx.transaction.create({
        data: {
          reference: pimpayReference,
          externalId: mtnReferenceId,
          amount: formData.amount,
          currency: "USD",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          toUserId: user.id,
          toWalletId: wallet.id,
          description: `Dépôt via ${formData.method}`,
          metadata: {
            phone: formData.phone,
            gateway: "MTN_MOMO_PRODUCTION"
          }
        }
      });

      // B. Créer la notification système (In-App)
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Dépôt initié ⏳",
          message: `Votre dépôt de ${formData.amount} USD est en attente de confirmation.`,
          type: "INFO"
        }
      });

      return txn;
    }, { maxWait: 10000, timeout: 30000 });

    return {
      success: true,
      reference: result.reference,
      status: "PENDING"
    };

  } catch (error) {
    console.error("❌ Erreur Interne PimPay:", error);
    return { success: false, error: "Le protocole de dépôt a rencontré une erreur." };
  }
}
