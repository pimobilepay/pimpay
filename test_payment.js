const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const CONFIG = {
    COLLECTION_KEY: 'be348175da3041539aa325294a43cdf6', // Ta clé Collections
    USER_ID: 'f80ff15f-a76c-42af-8f5b-ff6c5ca4c9bc',
    API_KEY: 'd050f8202cce434aa9d120c89719fea4', 
    BASE_URL: 'https://sandbox.momodeveloper.mtn.com'
};

// Fonction pour attendre (indispensable en Sandbox)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function validatePimpayPayment() {
    try {
        console.log("--- 💳 TEST FINAL DU FLUX DE PAIEMENT ---");

        // 1. Token
        const auth = Buffer.from(`${CONFIG.USER_ID}:${CONFIG.API_KEY}`).toString('base64');
        const tokenRes = await axios.post(`${CONFIG.BASE_URL}/collection/token/`, {}, {
            headers: { 'Authorization': `Basic ${auth}`, 'Ocp-Apim-Subscription-Key': CONFIG.COLLECTION_KEY }
        });
        const token = tokenRes.data.access_token;
        console.log("✅ Étape 1 : Token généré.");

        // 2. Request to Pay
        const transId = uuidv4();
        await axios.post(`${CONFIG.BASE_URL}/collection/v1_0/requesttopay`, 
            {
                "amount": "1000",
                "currency": "EUR",
                "externalId": "pimpay-ref-001",
                "payer": { "partyIdType": "MSISDN", "partyId": "46733123453" },
                "payerMessage": "Paiement Pimpay",
                "payeeNote": "Validé"
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Reference-Id': transId,
                    'X-Target-Environment': 'sandbox',
                    'Ocp-Apim-Subscription-Key': CONFIG.COLLECTION_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Étape 2 : Demande acceptée (ID: ${transId})`);

        // 3. ATTENTE DE 5 SECONDES (Pour laisser la Sandbox respirer)
        console.log("⏳ Attente du traitement par MTN...");
        await sleep(5000);

        // 4. Vérification du statut
        const statusRes = await axios.get(`${CONFIG.BASE_URL}/collection/v1_0/requesttopay/${transId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Target-Environment': 'sandbox',
                'Ocp-Apim-Subscription-Key': CONFIG.COLLECTION_KEY
            }
        });

        console.log("------------------------------------------");
        console.log(`💰 STATUT FINAL : ${statusRes.data.status}`); 
        console.log("------------------------------------------");

    } catch (error) {
        console.error("\n❌ ERREUR :");
        console.error(error.response ? error.response.data : error.message);
    }
}

validatePimpayPayment();
