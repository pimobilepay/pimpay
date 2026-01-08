const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * CONFIGURATION POUR PIMPAY
 * Ce script automatise la création de l'API User et de l'API Key
 * sur l'environnement Sandbox de MTN MoMo.
 */

// 1. Ta clé Primary Key (Collections)
const SUBSCRIPTION_KEY = 'be348175da3041539aa325294a43cdf6'; 

// 2. Génération d'un ID unique pour ton utilisateur API
const REFERENCE_ID = uuidv4(); 

// 3. URL de base pour la Sandbox
const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

async function runProvisioning() {
    console.log("--------------------------------------------------");
    console.log("🚀 INITIALISATION DU SANDBOX USER - PIMPAY");
    console.log("--------------------------------------------------");

    try {
        // ÉTAPE 1 : Créer l'API User dans le système de MTN
        console.log(`\n1️⃣  Création de l'API User...`);
        console.log(`    ID généré : ${REFERENCE_ID}`);
        
        await axios.post(`${BASE_URL}/v1_0/apiuser`, 
            { providerCallbackHost: "localhost" }, 
            {
                headers: {
                    'X-Reference-Id': REFERENCE_ID,
                    'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("    ✅ Succès : L'utilisateur est enregistré.");

        // ÉTAPE 2 : Demander une API Key pour cet utilisateur
        console.log(`\n2️⃣  Génération de l'API Key...`);
        const resKey = await axios.post(`${BASE_URL}/v1_0/apiuser/${REFERENCE_ID}/apikey`, 
            {}, 
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const apiKey = resKey.data.apiKey;
        console.log(`    ✅ Succès : Clé API générée.`);

        // ÉTAPE 3 : Test de connexion (Obtention du Token OAuth2)
        console.log(`\n3️⃣  Test de connexion finale...`);
        const authBase64 = Buffer.from(`${REFERENCE_ID}:${apiKey}`).toString('base64');
        
        const resToken = await axios.post(`${BASE_URL}/collection/token/`, {}, {
            headers: {
                'Authorization': `Basic ${authBase64}`,
                'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
            }
        });

        console.log("\n==================================================");
        console.log("🎉 BRAVO ! LES ACCÈS SONT PRÊTS POUR PIMPAY");
        console.log("==================================================");
        console.log(`👉 USER_ID : ${REFERENCE_ID}`);
        console.log(`👉 API_KEY : ${apiKey}`);
        console.log("==================================================");
        console.log("\nCopie ces deux valeurs, nous allons les mettre");
        console.log("dans ton code React / Node.js maintenant.");

    } catch (error) {
        console.error("\n❌ ERREUR LORS DU PROCESSUS :");
        if (error.response) {
            console.error(`Code Status : ${error.response.status}`);
            console.error(`Détails :`, JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                console.error("\n💡 Conseil : Ta clé Primary Key semble encore invalide ou non activée.");
            }
        } else {
            console.error(`Erreur réseau : ${error.message}`);
        }
    }
}

runProvisioning();
