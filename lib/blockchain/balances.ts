// lib/blockchain/balances.ts
//
// Fonctions de lecture du solde on-chain pour les chaînes qui n'avaient pas
// encore de synchronisation automatique : Bitcoin, Solana, XRP, Stellar (XLM)
// et les stablecoins EVM (USDC / BUSD / DAI) sur la Binance Smart Chain.
//
// Toutes les fonctions retournent un montant "humain" (number) et ne lèvent
// jamais : en cas d'erreur réseau elles renvoient null pour que l'appelant
// puisse simplement ignorer la synchronisation sans casser la requête.

import axios from "axios";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ethers } from "ethers";

const TIMEOUT = 8000;

// ─────────────────────────────────────────────────────────────────────────────
// BITCOIN — via l'API publique mempool.space (fallback blockstream.info)
// ─────────────────────────────────────────────────────────────────────────────
export async function getBtcBalance(address: string): Promise<number | null> {
  const endpoints = [
    `https://mempool.space/api/address/${address}`,
    `https://blockstream.info/api/address/${address}`,
  ];
  for (const url of endpoints) {
    try {
      const { data } = await axios.get(url, { timeout: TIMEOUT });
      const funded = data?.chain_stats?.funded_txo_sum ?? 0;
      const spent = data?.chain_stats?.spent_txo_sum ?? 0;
      const sats = Number(funded) - Number(spent);
      if (!isNaN(sats)) {
        return sats / 1e8; // satoshis -> BTC
      }
    } catch (err) {
      console.warn(`[BTC_BALANCE] ${url} failed, trying next...`);
    }
  }
  console.error("[BTC_BALANCE] Tous les endpoints ont échoué");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLANA — via @solana/web3.js (RPC public mainnet-beta avec fallbacks)
// ─────────────────────────────────────────────────────────────────────────────
const SOL_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
];
export async function getSolBalance(address: string): Promise<number | null> {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    console.error("[SOL_BALANCE] Adresse Solana invalide:", address);
    return null;
  }
  for (const rpc of SOL_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(rpc, "confirmed");
      const lamports = await Promise.race([
        connection.getBalance(pubkey),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), TIMEOUT)
        ),
      ]);
      return Number(lamports) / LAMPORTS_PER_SOL;
    } catch (err) {
      console.warn(`[SOL_BALANCE] ${rpc} failed, trying next...`);
    }
  }
  console.error("[SOL_BALANCE] Tous les endpoints Solana ont échoué");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// XRP — via le JSON-RPC public du XRP Ledger (account_info)
// ─────────────────────────────────────────────────────────────────────────────
const XRP_RPC_ENDPOINTS = [
  "https://xrplcluster.com/",
  "https://s1.ripple.com:51234/",
  "https://s2.ripple.com:51234/",
];
export async function getXrpBalance(address: string): Promise<number | null> {
  for (const url of XRP_RPC_ENDPOINTS) {
    try {
      const { data } = await axios.post(
        url,
        {
          method: "account_info",
          params: [{ account: address, ledger_index: "validated" }],
        },
        { timeout: TIMEOUT }
      );
      const result = data?.result;
      // Compte non activé / inexistant => solde 0 (pas une erreur)
      if (result?.error === "actNotFound") return 0;
      const drops = result?.account_data?.Balance;
      if (drops !== undefined) {
        return Number(drops) / 1e6; // drops -> XRP
      }
    } catch (err) {
      console.warn(`[XRP_BALANCE] ${url} failed, trying next...`);
    }
  }
  console.error("[XRP_BALANCE] Tous les endpoints XRP ont échoué");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STELLAR (XLM) — via l'API publique Horizon
// ─────────────────────────────────────────────────────────────────────────────
export async function getXlmBalance(address: string): Promise<number | null> {
  try {
    const { data } = await axios.get(
      `https://horizon.stellar.org/accounts/${address}`,
      { timeout: TIMEOUT, validateStatus: (s) => s === 200 || s === 404 }
    );
    // Compte non financé => solde 0
    if (data?.status === 404) return 0;
    const balances = data?.balances ?? [];
    const native = balances.find((b: any) => b.asset_type === "native");
    if (native?.balance !== undefined) {
      return parseFloat(native.balance);
    }
    return 0;
  } catch (err: any) {
    // 404 = compte non financé sur Stellar
    if (err?.response?.status === 404) return 0;
    console.error("[XLM_BALANCE] Horizon a échoué:", err?.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVM TOKENS (USDC / BUSD / DAI) — BEP20 sur la Binance Smart Chain
// On réutilise l'adresse EVM (sidraAddress), comme le fait BNB.
// ─────────────────────────────────────────────────────────────────────────────
const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// Contrats officiels sur BSC Mainnet (tous en 18 décimales)
export const BSC_TOKENS: Record<string, { contract: string; decimals: number }> = {
  USDC: { contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  BUSD: { contract: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  DAI: { contract: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18 },
};

export async function getEvmTokenBalance(
  address: string,
  symbol: "USDC" | "BUSD" | "DAI"
): Promise<number | null> {
  const token = BSC_TOKENS[symbol];
  if (!token) return null;

  for (const rpc of BSC_RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const contract = new ethers.Contract(token.contract, ERC20_ABI, provider);
      const raw = await Promise.race([
        contract.balanceOf(address),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), TIMEOUT)
        ),
      ]);
      return parseFloat(ethers.formatUnits(raw, token.decimals));
    } catch (err) {
      console.warn(`[EVM_TOKEN_BALANCE] ${symbol} via ${rpc} failed, trying next...`);
    }
  }
  console.error(`[EVM_TOKEN_BALANCE] Tous les endpoints BSC ont échoué pour ${symbol}`);
  return null;
}
