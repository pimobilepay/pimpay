"use server";

import { v4 as uuidv4 } from "uuid";

const MTN_CONFIG = {
  baseUrl: "https://sandbox.momodeveloper.mtn.com",
  subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY!,
  apiUser: process.env.MTN_API_USER!, // Le REFERENCE_ID généré plus haut
  apiKey: process.env.MTN_API_KEY!,   // L'API_KEY générée plus haut
  targetEnv: "sandbox"
};

// 1. Générer le Token d'accès (Obligatoire pour chaque session)
async function getMTNToken() {
  const auth = Buffer.from(`${MTN_CONFIG.apiUser}:${MTN_CONFIG.apiKey}`).toString('base64');
  
  const res = await fetch(`${MTN_CONFIG.baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey
    }
  });
  const data = await res.json();
  return data.access_token;
}

// 2. Action de Dépôt (Request To Pay)
export async function processMTNDeposit(amount: string, phone: string) {
  try {
    const token = await getMTNToken();
    const referenceId = uuidv4(); // Identifiant unique de transaction

    const response = await fetch(`${MTN_CONFIG.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MTN_CONFIG.targetEnv,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey
      },
      body: JSON.stringify({
        amount: amount,
        currency: "EUR", // En Sandbox MTN utilise souvent EUR/USD par défaut
        externalId: "PIMPAY_DEP_" + Date.now(),
        payer: { partyIdType: "MSISDN", partyId: phone },
        payerMessage: "Depot sur PimPay",
        payeeNote: "Liquidity Inflow"
      })
    });

    if (response.status === 202) {
      return { success: true, ref: referenceId };
    }
    return { success: false, error: "Erreur lors de l'initialisation" };
  } catch (error) {
    return { success: false, error: "Échec de connexion MTN" };
  }
}
