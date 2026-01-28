require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// --- CONFIGURATION PIMPAY ---
// Remplace les valeurs ci-dessous par celles générées par ton script de setup réussi
const CONFIG = {
    BASE_URL: 'https://sandbox.momodeveloper.mtn.com',
    PRIMARY_KEY: process.env.MOMO_PRIMARY_KEY || '07c9a004fdba4670ae8d3f966b36e8f9', 
    API_USER: process.env.MOMO_USER_ID, // Utilise le nouvel ID (ex: 59abfc85...)
    API_KEY: process.env.MOMO_API_KEY,   // Utilise la nouvelle API Key
    CURRENCY: 'XAF',
    TARGET_ENV: 'sandbox'
};

async function testerDepot() {
    // Sécurité : vérifier que les clés sont présentes
    if (!CONFIG.API_USER || !CONFIG.API_KEY) {
        console.error("❌ Erreur : MOMO_USER_ID ou MOMO_API_KEY manquant dans le .env");
        return;
    }

    try {
        console.log(`--- [PIMPAY] Test Dépôt (RequestToPay) ---`);
        console.log(`Utilisateur API : ${CONFIG.API_USER}`);

        // 1. Authentification pour obtenir le Token
        const auth = Buffer.from(`${CONFIG.API_USER}:${CONFIG.API_KEY}`).toString('base64');

        const tokenResponse = await axios.post(`${CONFIG.BASE_URL}/collection/token/`, {}, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Ocp-Apim-Subscription-Key': CONFIG.PRIMARY_KEY
            }
        });

        const accessToken = tokenResponse.data.access_token;
        const referenceId = uuidv4();

        // 2. Préparation de la demande de paiement
        const requestData = {
            amount: "500", // Test avec 500 XAF
            currency: CONFIG.CURRENCY,
            externalId: "PP-" + Math.floor(Math.random() * 100000),
            payer: {
                partyIdType: "MSISDN",
                partyId: "242065540305" // Pas de '+' pour le partyId MTN
            },
            payerMessage: "Depot vers PimPay",
            payeeNote: "Achat SDA PimPay"
        };

        // 3. Envoi de la requête RequestToPay
        const response = await axios.post(`${CONFIG.BASE_URL}/collection/v1_0/requesttopay`, requestData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Reference-Id': referenceId,
                'X-Target-Environment': CONFIG.TARGET_ENV,
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': CONFIG.PRIMARY_KEY
            }
        });

        // 202 Accepted signifie que la demande est partie vers le téléphone
        if (response.status === 202) {
            console.log("\n================================================");
            console.log("✅ SUCCÈS : Demande envoyée au téléphone !");
            console.log(`Référence Transaction : ${referenceId}`);
            console.log("================================================");
            console.log("L'utilisateur recevrait maintenant un pop-up");
            console.log("sur son mobile au Congo pour valider son PIN.");
        }

    } catch (error) {
        console.error("\n❌ ÉCHEC DU DÉPÔT :");
        if (error.response) {
            console.error(`Code : ${error.response.status}`);
            console.error(`Message :`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testerDepot();
