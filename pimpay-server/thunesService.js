/**
 * PIMPAY - Intégration Agrégateur Thunes
 * Script de test pour la création d'une Cotation (Quotation)
 */

const axios = require('axios'); // Assure-toi de faire : npm install axios

// 1. Configuration des accès (À mettre dans ton fichier .env plus tard)
const API_KEY = 'VOTRE_API_KEY'; 
const API_SECRET = 'VOTRE_API_SECRET';
const BASE_URL = 'https://api.thunes.com/v2/money-transfer';

// Encodage des identifiants pour le Basic Auth
const authHeader = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

async function getPimPayQuotation() {
  const endpoint = `${BASE_URL}/quotations`;

  // 2. Données de la requête (Exemple : Envoi de 100 USD vers le Sénégal en FCFA)
  const quotationData = {
    source_amount: 100.00,
    source_currency: "USD",
    destination_country_iso_code: "SEN", // Sénégal
    destination_currency: "XOF",         // FCFA
    payout_method: "MOBILE_WALLET",      // Le service visé
    payer_id: 1,                         // ID récupéré via GET /payers
    transaction_type: "C2C"              // Consumer to Consumer
  };

  try {
    console.log("--- Initialisation de la cotation PimPay ---");
    
    const response = await axios.post(endpoint, quotationData, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    // 3. Analyse de la réponse
    const { id, wholesale_fx_rate, destination_amount, fee } = response.data;

    console.log("✅ Cotation reçue avec succès !");
    console.log(`ID Cotation : ${id}`);
    console.log(`Taux de change (FX) : 1 USD = ${wholesale_fx_rate} XOF`);
    console.log(`Le bénéficiaire recevra : ${destination_amount} XOF`);
    console.log(`Frais Thunes : ${fee.amount} ${fee.currency}`);
    
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error("❌ Erreur API Thunes :", error.response.data);
    } else {
      console.error("❌ Erreur de connexion :", error.message);
    }
  }
}

// Lancement du test
getPimPayQuotation();
