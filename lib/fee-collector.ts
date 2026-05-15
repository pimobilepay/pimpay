/**
 * FEE COLLECTOR — PimPay
 *
 * Centralise tous les frais on-chain (BNB, ETH, SDA) vers l'adresse
 * opérateur centrale. TRX, USDT et PI sont exclus intentionnellement.
 *
 * Adresse centrale : process.env.SDA_OPERATOR_ADDRESS
 */

import { ethers } from "ethers";

// ─── Adresse centrale de collecte des frais ──────────────────────────────────
export const FEE_COLLECTOR_ADDRESS =
  process.env.SDA_OPERATOR_ADDRESS ||
  "0xe72cC1d1698497440D06B1256216CEEad07Ea3DB";

// ─── Devises concernées (exclu : TRX, USDT, PI) ──────────────────────────────
export const FEE_COLLECTED_CURRENCIES = ["BNB", "ETH", "SDA", "SIDRA"] as const;
export type FeeCollectedCurrency = (typeof FEE_COLLECTED_CURRENCIES)[number];

// ─── RPC par réseau ───────────────────────────────────────────────────────────
const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
  BNB: "https://bsc-dataseed1.binance.org",
  ETH: "https://cloudflare-eth.com",
};

export interface FeeCollectResult {
  success: boolean;
  currency: string;
  feeAmount: number;
  txHash?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Envoie les frais on-chain vers l'adresse centrale pour une devise donnée.
 *
 * @param currency  La devise du frais (BNB | ETH | SDA | SIDRA)
 * @param feeAmount Le montant du frais (en unité native, ex: 0.001 BNB)
 * @param fromPrivateKey  Clé privée du wallet source (déjà décryptée, préfixée 0x)
 */
export async function collectFeeOnChain(
  currency: string,
  feeAmount: number,
  fromPrivateKey: string
): Promise<FeeCollectResult> {
  const curr = currency.toUpperCase();

  // Vérifier que la devise est prise en charge
  if (!FEE_COLLECTED_CURRENCIES.includes(curr as FeeCollectedCurrency)) {
    return {
      success: true,
      currency: curr,
      feeAmount,
      skipped: true,
      skipReason: `${curr} exclu de la collecte centralisée (TRX/USDT/PI gérés séparément)`,
    };
  }

  // Vérifier le montant minimum (évite les gas > fee)
  const MIN_FEE: Record<string, number> = {
    BNB: 0.00005,
    ETH: 0.00001,
    SDA: 0.001,
    SIDRA: 0.001,
  };
  if (feeAmount < (MIN_FEE[curr] ?? 0.00001)) {
    return {
      success: true,
      currency: curr,
      feeAmount,
      skipped: true,
      skipReason: `Montant trop faible pour couvrir le gas (${feeAmount} ${curr})`,
    };
  }

  const rpcUrl = RPC_URLS[curr];
  if (!rpcUrl) {
    return {
      success: false,
      currency: curr,
      feeAmount,
      error: `Aucun RPC configuré pour ${curr}`,
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const senderWallet = new ethers.Wallet(fromPrivateKey, provider);

    // Estimer le gas
    let gasLimit = BigInt(21000);
    let gasPrice =
      curr === "BNB"
        ? ethers.parseUnits("5", "gwei")
        : ethers.parseUnits("1", "gwei");

    try {
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) gasPrice = feeData.gasPrice;
    } catch {
      // Garder les valeurs par défaut si le RPC ne répond pas
    }

    const gasCost = gasLimit * gasPrice;
    const feeInWei = ethers.parseEther(feeAmount.toFixed(18).replace(/\.?0+$/, ""));

    // S'assurer que le frais couvre le gas
    if (feeInWei <= gasCost) {
      return {
        success: true,
        currency: curr,
        feeAmount,
        skipped: true,
        skipReason: `Frais (${feeAmount} ${curr}) inférieur au gas estimé`,
      };
    }

    // Vérifier que le solde du wallet source est suffisant
    const senderBalance = await provider.getBalance(senderWallet.address);
    if (senderBalance < feeInWei) {
      return {
        success: false,
        currency: curr,
        feeAmount,
        error: `Solde insuffisant pour envoyer ${feeAmount} ${curr} (disponible: ${ethers.formatEther(senderBalance)})`,
      };
    }

    // Envoyer les frais vers l'adresse centrale
    const tx = await senderWallet.sendTransaction({
      to: FEE_COLLECTOR_ADDRESS,
      value: feeInWei,
      gasLimit,
      gasPrice,
    });

    const receipt = await tx.wait();
    const txHash = receipt?.hash || tx.hash;

    console.log(
      `[FEE_COLLECTOR] ✅ ${feeAmount} ${curr} → ${FEE_COLLECTOR_ADDRESS} | txHash: ${txHash}`
    );

    return {
      success: true,
      currency: curr,
      feeAmount,
      txHash,
    };
  } catch (err: any) {
    console.error(`[FEE_COLLECTOR] ❌ Erreur ${curr}:`, err.message);
    return {
      success: false,
      currency: curr,
      feeAmount,
      error: err.message,
    };
  }
}

/**
 * Collecte les frais depuis le wallet opérateur SDA (SIDRA_OPERATOR_PRIVATE_KEY).
 * Utilisé pour les frais générés par les retraits SDA signés par l'opérateur.
 */
export async function collectSdaOperatorFee(
  feeAmount: number
): Promise<FeeCollectResult> {
  const key = process.env.SIDRA_OPERATOR_PRIVATE_KEY;
  if (!key) {
    return {
      success: true,
      currency: "SDA",
      feeAmount,
      skipped: true,
      skipReason: "SIDRA_OPERATOR_PRIVATE_KEY non configuré",
    };
  }

  let privateKey = key.trim();
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return {
      success: false,
      currency: "SDA",
      feeAmount,
      error: "Format SIDRA_OPERATOR_PRIVATE_KEY invalide",
    };
  }

  return collectFeeOnChain("SDA", feeAmount, privateKey);
}
