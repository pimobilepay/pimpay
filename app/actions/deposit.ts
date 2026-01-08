"use server";

import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const MTN_CONFIG = {
  baseUrl: "https://sandbox.momodeveloper.mtn.com",
  subscriptionKey: "be348175da3041539aa325294a43cdf6", 
  apiUser: "f80ff15f-a76c-42af-8f5b-ff6c5ca4c9bc",      
  apiKey: "d050f8202cce434aa9d120c89719fea4", // Remplace par ta clé API générée
  targetEnv: "sandbox",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processDeposit(formData: {
  amount: number;
  method: string;
  phone: string;
  currency: string;
  isSandbox?: boolean;
}) {
  const mtnReferenceId = uuidv4();
  const pimpayReference = `TX-PIM-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;

  try {
    const user = await prisma.user.findFirst();
    if (!user) return { success: false, error: "Utilisateur introuvable." };

    // --- LOGIQUE MTN ---
    if (formData.method.toLowerCase().includes("mtn")) {
      try {
        // A. Token
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

        // B. Request To Pay en USD
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
            currency: "USD", // Forcé en USD pour PimPay
            externalId: pimpayReference,
            payer: {
              partyIdType: "MSISDN",
              partyId: formData.phone.replace('+', '').trim()
            },
            payerMessage: `PimPay Deposit: ${formData.amount} USD`,
            payeeNote: "PimPay Protocol"
          })
        });

        if (mtnRes.status !== 202) throw new Error("Transaction refusée par le gateway");

        // Attente de propagation Sandbox
        await sleep(2500);

      } catch (mtnError: any) {
        console.error("❌ Erreur MTN Gateway:", mtnError.message);
        return { success: false, error: "Erreur de communication avec l'opérateur." };
      }
    }

    // --- ENREGISTREMENT PRISMA (Toujours en USD) ---
    const result = await prisma.transaction.create({
      data: {
        reference: pimpayReference,
        amount: formData.amount,
        purpose: "DEPOSIT",
        status: TransactionStatus.PENDING,
        fromUserId: user.id,
        toUserId: user.id,
        operatorId: formData.method,
        countryCode: "USD", 
        description: `Dépôt PimPay via ${formData.method}`,
        metadata: {
          phone: formData.phone,
          mtnReference: mtnReferenceId,
          currency: "USD",
          isSandbox: true
        }
      }
    });

    return { 
      success: true, 
      reference: result.reference, 
      mtnId: mtnReferenceId 
    };

  } catch (error) {
    console.error("❌ Erreur PimPay:", error);
    return { success: false, error: "Erreur lors du traitement PimPay." };
  }
}
