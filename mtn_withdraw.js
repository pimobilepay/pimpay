const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * PIMPAY - Script de Provisioning Sandbox
 * Ce script génère vos identifiants API définitifs.
 */

// --- CONFIGURATION ---
// Utilise bien la Primary Key du produit correspondant (Collection ou Disbursement)
const SUBSCRIPTION_KEY = '07c9a004fdba4670ae8d3f966b36e8f9'; 
const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
const REFERENCE_ID = uuidv4(); 

async function runProvisioning() {
    console.log("--------------------------------------------------");
    console.log("🚀 INITIALISATION DES ACCÈS PIMPAY (MTN CONGO)");
    console.log("--------------------------------------------------");

    try {
        // ÉTAPE 1 : Création de l'API User
        console.log(`\n1️⃣  Création de l'API User...`);
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
        console.log(`    ✅ USER_ID créé : ${REFERENCE_ID}`);

        // ÉTAPE 2 : Génération de l'API Key
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
        
        console.log("\n==================================================");
        console.log("🎉 IDENTIFIANTS GÉNÉRÉS AVEC SUCCÈS !");
        console.log("==================================================");
        console.log(`👉 MOMO_USER_ID : ${REFERENCE_ID}`);
        console.log(`👉 MOMO_API_KEY : ${apiKey}`);
        console.log("==================================================");
        console.log("Copie ces valeurs dans ton fichier .env maintenant.");

        // ÉTAPE 3 : Test de validation du Token
        console.log(`\n3️⃣  Tentative de connexion (Validation)...`);
        const authBase64 = Buffer.from(`${REFERENCE_ID}:${apiKey}`).toString('base64');

        // On teste sur collection par défaut
        const resToken = await axios.post(`${BASE_URL}/collection/token/`, {}, {
            headers: {
                'Authorization': `Basic ${authBase64}`,
                'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
            }
        });

        if (resToken.data.access_token) {
            console.log("    ✅ Connexion validée ! Le système est prêt.");
        }

    } catch (error) {
        console.error("\n❌ INFO : Le processus s'est arrêté.");
        if (error.response) {
            // Si l'erreur arrive à l'étape 3, ce n'est pas grave, les clés sont déjà affichées au-dessus
            if (error.response.status === 401) {
                console.log("💡 Note : La validation finale a échoué (401), mais vérifie si tes clés sont affichées plus haut.");
            } else {
                console.error(`Détails :`, error.response.data);
            }
        } else {
            console.error(`Erreur réseau : ${error.message}`);
        }
    }
}

runProvisioning();
