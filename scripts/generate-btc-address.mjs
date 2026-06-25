/**
 * Génère une adresse opérateur Bitcoin (BTC) qui réceptionnera les frais.
 *
 *   node scripts/generate-btc-address.mjs              -> SegWit natif bc1... (par défaut)
 *   node scripts/generate-btc-address.mjs --type p2sh  -> SegWit imbriqué 3...
 *   node scripts/generate-btc-address.mjs --type legacy-> Legacy 1...
 *
 * ⚠️  SÉCURITÉ
 *   - La clé privée (WIF) donne le contrôle TOTAL des fonds : ne la committez
 *     jamais, ne la mettez jamais dans une variable d'env publique.
 *   - Seule l'ADRESSE publique va dans BTC_OPERATOR_ADDRESS.
 *   - Conservez la clé privée hors-ligne (cold storage / gestionnaire de secrets).
 */

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";

const ECPair = ECPairFactory(ecc);
const network = bitcoin.networks.bitcoin; // mainnet

const typeArg = process.argv.indexOf("--type");
const type = typeArg !== -1 ? process.argv[typeArg + 1] : "bech32";

const keyPair = ECPair.makeRandom({ network });
const pubkey = Buffer.from(keyPair.publicKey);

let payment;
let label;
switch (type) {
  case "legacy":
    payment = bitcoin.payments.p2pkh({ pubkey, network });
    label = "Legacy (P2PKH, 1...)";
    break;
  case "p2sh":
    payment = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey, network }),
      network,
    });
    label = "SegWit imbriqué (P2SH-P2WPKH, 3...)";
    break;
  case "bech32":
  default:
    payment = bitcoin.payments.p2wpkh({ pubkey, network });
    label = "SegWit natif (P2WPKH, bc1...)";
    break;
}

console.log("\n=== Adresse opérateur BTC générée ===\n");
console.log("Type             :", label);
console.log("Adresse (PUBLIC) :", payment.address);
console.log("Clé privée (WIF) :", keyPair.toWIF());
console.log("\n-------------------------------------");
console.log("→ Mettez l'adresse dans BTC_OPERATOR_ADDRESS (variables du projet).");
console.log("→ Sauvegardez la clé privée WIF HORS-LIGNE. Ne la committez jamais.\n");
