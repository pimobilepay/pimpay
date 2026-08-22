// lib/blockchain/dogecoin.ts
//
// Support Dogecoin (DOGE) complet : génération d'adresse/clé, lecture du
// solde on-chain, récupération des UTXO et diffusion de transaction signée.
//
// Avant ce fichier, DOGE n'avait AUCUNE adresse dédiée dans le schéma Prisma :
// l'app affichait par erreur l'adresse EVM (0x...) comme "adresse de dépôt
// DOGE", ce qui n'est pas un format Dogecoin valide (P2PKH base58, version
// byte 0x1e → préfixe 'D'). Résultat : aucun dépôt DOGE ne pouvait jamais
// être détecté ni crédité, et un retrait DOGE n'était jamais diffusé
// on-chain (le worker n'implémentait aucun broadcast pour DOGE).
//
// Toutes les fonctions de lecture réseau ne lèvent jamais : en cas d'échec
// elles renvoient null, comme le reste de lib/blockchain/*.

import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as tinysecp from "tiny-secp256k1";

const ECPair = ECPairFactory(tinysecp);
const TIMEOUT = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Paramètres réseau Dogecoin (mainnet) — compatibles bitcoinjs-lib.
// Dogecoin ne supporte pas SegWit : uniquement des adresses P2PKH legacy.
// ─────────────────────────────────────────────────────────────────────────────
export const DOGECOIN_NETWORK: bitcoin.networks.Network = {
  messagePrefix: "\x19Dogecoin Signed Message:\n",
  bech32: "doge", // inutilisé (pas de SegWit), requis par le typage
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e, // adresses commençant par 'D'
  scriptHash: 0x16, // adresses P2SH commençant par 'A' ou '9'
  wif: 0x9e, // clés privées WIF commençant par '6' ou 'Q'/'q'
};

export interface GeneratedDogeWallet {
  address: string;
  privateKeyWIF: string;
}

/** Génère une nouvelle paire adresse/clé Dogecoin (P2PKH). */
export function generateDogeWallet(): GeneratedDogeWallet {
  const keyPair = ECPair.makeRandom({ network: DOGECOIN_NETWORK });
  const { address } = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network: DOGECOIN_NETWORK,
  });
  if (!address) throw new Error("[DOGE] Échec génération adresse");
  return { address, privateKeyWIF: keyPair.toWIF() };
}

/** Valide le format d'une adresse Dogecoin P2PKH/P2SH mainnet. */
export function isValidDogeAddress(address: string): boolean {
  try {
    const decoded = bitcoin.address.fromBase58Check(address);
    return (
      decoded.version === DOGECOIN_NETWORK.pubKeyHash ||
      decoded.version === DOGECOIN_NETWORK.scriptHash
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTURE DU SOLDE — API publique BlockCypher (fallback dogechain.info)
// ─────────────────────────────────────────────────────────────────────────────
export async function getDogeBalance(address: string): Promise<number | null> {
  // 1) BlockCypher — retourne le solde en koinu (1 DOGE = 1e8 koinu)
  try {
    const { data } = await axios.get(
      `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`,
      { timeout: TIMEOUT }
    );
    const koinu = data?.final_balance;
    if (koinu !== undefined && koinu !== null) {
      return Number(koinu) / 1e8;
    }
  } catch (err) {
    console.warn("[DOGE_BALANCE] BlockCypher a échoué, fallback dogechain.info...");
  }

  // 2) Fallback dogechain.info — retourne directement un montant en DOGE
  try {
    const { data } = await axios.get(
      `https://dogechain.info/api/v1/address/balance/${address}`,
      { timeout: TIMEOUT }
    );
    if (data?.success === 1 && data?.balance !== undefined) {
      const n = parseFloat(data.balance);
      if (!isNaN(n)) return n;
    }
  } catch (err) {
    console.error("[DOGE_BALANCE] Tous les endpoints ont échoué:", (err as Error)?.message);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTXO + DIFFUSION — nécessaires pour signer et envoyer un retrait DOGE
// ─────────────────────────────────────────────────────────────────────────────
interface DogeUtxo {
  txid: string;
  vout: number;
  value: number; // en koinu
  rawTxHex: string; // requis: Dogecoin n'a pas de SegWit → nonWitnessUtxo
}

async function getRawTxHex(txid: string): Promise<string> {
  const { data } = await axios.get(
    `https://api.blockcypher.com/v1/doge/main/txs/${txid}?includeHex=true`,
    { timeout: TIMEOUT }
  );
  if (!data?.hex) throw new Error(`[DOGE] Impossible de récupérer la tx brute ${txid}`);
  return data.hex as string;
}

async function getDogeUtxos(address: string): Promise<DogeUtxo[]> {
  const { data } = await axios.get(
    `https://api.blockcypher.com/v1/doge/main/addrs/${address}?unspentOnly=true&includeScript=false`,
    { timeout: TIMEOUT }
  );
  const txrefs = [...(data?.txrefs ?? []), ...(data?.unconfirmed_txrefs ?? [])];
  if (!txrefs.length) return [];

  const utxos: DogeUtxo[] = [];
  for (const ref of txrefs) {
    const rawTxHex = await getRawTxHex(ref.tx_hash);
    utxos.push({
      txid: ref.tx_hash,
      vout: ref.tx_output_n,
      value: ref.value,
      rawTxHex,
    });
  }
  return utxos;
}

async function getDogeFeeRate(): Promise<number> {
  // Dogecoin Core recommande un minimum de 1 DOGE/kB de nos jours ; on
  // applique une marge de sécurité. Valeur en koinu par octet.
  const DEFAULT_SAT_PER_BYTE = 100_000_000 / 1000; // ~1 DOGE / kB → koinu/byte
  return DEFAULT_SAT_PER_BYTE;
}

async function broadcastDogeTxHex(hex: string): Promise<string> {
  try {
    const { data } = await axios.post(
      `https://api.blockcypher.com/v1/doge/main/txs/push`,
      { tx: hex },
      { timeout: TIMEOUT }
    );
    const hash = data?.tx?.hash;
    if (!hash) throw new Error("Réponse BlockCypher invalide");
    return hash as string;
  } catch (err: any) {
    // Fallback dogechain.info
    const { data } = await axios.post(
      `https://dogechain.info/api/v1/pushtx`,
      new URLSearchParams({ tx: hex }),
      { timeout: TIMEOUT, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (data?.success === 1 && data?.txid) return data.txid as string;
    throw new Error(err?.message || "Diffusion DOGE échouée sur tous les endpoints");
  }
}

export interface SendDogeParams {
  fromAddress: string;
  privateKeyWIF: string;
  toAddress: string;
  amountKoinu: number; // montant à envoyer, en koinu (1 DOGE = 1e8 koinu)
}

export interface SendDogeResult {
  txid: string;
  feeKoinu: number;
}

/**
 * Construit, signe et diffuse une transaction Dogecoin P2PKH classique
 * (sélection d'UTXO simple, "premier arrivé premier servi").
 */
export async function sendDoge({
  fromAddress,
  privateKeyWIF,
  toAddress,
  amountKoinu,
}: SendDogeParams): Promise<SendDogeResult> {
  if (!isValidDogeAddress(toAddress)) {
    throw new Error("Adresse Dogecoin de destination invalide");
  }

  const keyPair = ECPair.fromWIF(privateKeyWIF, DOGECOIN_NETWORK);
  const utxos = await getDogeUtxos(fromAddress);
  if (!utxos.length) throw new Error("Aucun fonds DOGE disponibles sur l'adresse source");

  const feeRate = await getDogeFeeRate();

  // Sélection d'UTXO : on accumule jusqu'à couvrir montant + frais estimés.
  const psbt = new bitcoin.Psbt({ network: DOGECOIN_NETWORK });
  let totalInput = 0;
  let usedInputs = 0;

  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(utxo.rawTxHex, "hex"),
    });
    totalInput += utxo.value;
    usedInputs += 1;

    const estimatedSize = usedInputs * 180 + 2 * 34 + 10; // legacy P2PKH approx
    const estimatedFee = Math.ceil(estimatedSize * feeRate);
    if (totalInput >= amountKoinu + estimatedFee) break;
  }

  const finalSize = usedInputs * 180 + 2 * 34 + 10;
  const fee = Math.ceil(finalSize * feeRate);

  if (totalInput < amountKoinu + fee) {
    throw new Error(
      `Solde DOGE on-chain insuffisant pour couvrir le montant + les frais réseau (~${(fee / 1e8).toFixed(8)} DOGE)`
    );
  }

  psbt.addOutput({ address: toAddress, value: BigInt(Math.round(amountKoinu)) });

  const change = totalInput - amountKoinu - fee;
  if (change > 0) {
    psbt.addOutput({ address: fromAddress, value: BigInt(Math.round(change)) });
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const rawTxHex = psbt.extractTransaction().toHex();
  const txid = await broadcastDogeTxHex(rawTxHex);

  return { txid, feeKoinu: fee };
}
