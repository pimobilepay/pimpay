// lib/blockchain/bnb.ts
import { ethers } from "ethers";

// RPC BSC Mainnet — on essaie plusieurs endpoints pour la fiabilité
const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
];

/**
 * Retourne le solde BNB natif d'une adresse EVM sur BSC Mainnet.
 * Essaie les endpoints en cascade jusqu'à en trouver un qui répond.
 */
export const getBnbBalance = async (address: string): Promise<string> => {
  let lastError: unknown;

  for (const rpcUrl of BSC_RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Timeout de 8s par endpoint
      const balancePromise = provider.getBalance(address);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 8000)
      );
      const balance = await Promise.race([balancePromise, timeoutPromise]);
      return ethers.formatEther(balance);
    } catch (error) {
      lastError = error;
      console.warn(`[BNB_BALANCE] Endpoint ${rpcUrl} failed, trying next...`, error);
    }
  }

  console.error("[BNB_BALANCE] Tous les endpoints BSC ont échoué:", lastError);
  return "0";
};
