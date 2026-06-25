/**
 * Génère une adresse opérateur TRON (TRX + USDT TRC-20) qui réceptionnera
 * les frais. Sur le réseau TRON, TRX et les tokens TRC-20 (dont l'USDT)
 * partagent LA MÊME adresse : une seule adresse suffit pour les deux.
 *
 *   node scripts/generate-tron-address.mjs
 *
 * ⚠️  SÉCURITÉ
 *   - La clé privée donne le contrôle TOTAL des fonds : ne la committez jamais.
 *   - Seule l'ADRESSE publique (T...) va dans TRON_OPERATOR_ADDRESS.
 *   - Conservez la clé privée hors-ligne (cold storage / gestionnaire de secrets).
 */

import { TronWeb } from "tronweb";

const account = TronWeb.createRandom();

console.log("\n=== Adresse opérateur TRON générée (TRX + USDT TRC-20) ===\n");
console.log("Adresse Base58 (PUBLIC) :", account.address);
console.log("Clé privée              :", account.privateKey);
console.log("Phrase mnémonique       :", account.mnemonic.phrase);
console.log("\n----------------------------------------------------------");
console.log("→ Mettez l'adresse Base58 (T...) dans TRON_OPERATOR_ADDRESS.");
console.log("→ La même adresse reçoit TRX ET USDT (TRC-20).");
console.log("→ Sauvegardez la clé privée HORS-LIGNE. Ne la committez jamais.\n");
