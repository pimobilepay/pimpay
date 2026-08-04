/**
 * ENCAISSEMENT AUTOMATIQUE DES FRAIS — PimPay
 *
 * Ce module est la façade historique appelée par toutes les routes qui
 * prélèvent un frais. Il délègue désormais à `lib/operator-wallet.ts`, qui
 * crédite le **wallet opérateur** dans la **devise d'origine du frais**.
 *
 * Pourquoi ce changement :
 *  - L'ancienne implémentation créditait un wallet `type: "ADMIN"` avec une
 *    transaction `type: "FEE_CONVERSION"` et un utilisateur `"system"` — trois
 *    valeurs absentes du schéma Prisma. Chaque appel levait une erreur
 *    silencieuse (les appelants font `.catch(() => {})`) : AUCUN frais n'était
 *    jamais encaissé.
 *  - On crédite maintenant un wallet opérateur réel, par devise, de façon
 *    atomique et idempotente, avec double écriture comptable.
 *
 * La conversion en Pi n'est plus faite à l'encaissement : elle reste
 * disponible côté admin (Trésorerie), et l'équivalent Pi est tout de même
 * calculé ici à titre indicatif pour les tableaux de bord.
 */

import { prisma } from "@/lib/prisma";
import { FIAT_RATES } from "@/lib/exchange";
import { getPiPrice } from "@/lib/fees";
import {
  creditOperatorFee,
  sweepUncollectedFees,
  roundFee,
} from "@/lib/operator-wallet";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export interface ConversionResult {
  success: boolean;
  originalAmount: number;
  originalCurrency: string;
  /** Équivalent Pi indicatif du frais encaissé (aucune conversion réelle). */
  convertedPi: number;
  conversionRate: number;
  transactionRef: string;
  /** true si le frais avait déjà été encaissé (idempotence). */
  alreadyCollected?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  HELPERS DE VALORISATION (indicatif)                                */
/* ------------------------------------------------------------------ */

/** Valeur en USD d'un montant, pour les agrégats admin. */
function toUsd(amount: number, currency: string, piPrice: number): number {
  const curr = (currency || "").toUpperCase();
  if (curr === "USD") return amount;
  if (curr === "PI") return amount * piPrice;
  if (FIAT_RATES[curr]) return amount / FIAT_RATES[curr];
  return amount;
}

/** Taux devise → Pi, uniquement pour affichage. */
function getConversionRate(currency: string, piPrice: number): number {
  const curr = (currency || "").toUpperCase();
  if (curr === "PI") return 1;
  if (piPrice <= 0) return 0;
  if (FIAT_RATES[curr]) return 1 / (FIAT_RATES[curr] * piPrice);
  return 1 / piPrice;
}

/* ------------------------------------------------------------------ */
/*  ENCAISSEMENT                                                       */
/* ------------------------------------------------------------------ */

/**
 * Encaisse un frais de plateforme sur le wallet opérateur.
 *
 * Le nom est conservé pour compatibilité avec les routes existantes, mais le
 * frais n'est plus converti : il est crédité dans sa devise d'origine.
 *
 * @param feeAmount     Montant du frais prélevé
 * @param feeCurrency   Devise du frais (PI, XAF, USDT, BTC…)
 * @param transactionId ID de la transaction d'origine (clé d'idempotence)
 * @param transactionRef Référence lisible de la transaction d'origine
 * @param feeType       Nature du frais (transfer, withdraw, exchange…)
 */
export async function autoConvertFeeToPi(
  feeAmount: number,
  feeCurrency: string,
  transactionId: string,
  transactionRef: string,
  feeType?: string
): Promise<ConversionResult> {
  const currency = (feeCurrency || "USD").toUpperCase();

  if (!feeAmount || feeAmount <= 0) {
    return {
      success: true,
      originalAmount: 0,
      originalCurrency: currency,
      convertedPi: 0,
      conversionRate: 0,
      transactionRef,
    };
  }

  const credit = await creditOperatorFee({
    amount: feeAmount,
    currency,
    sourceTransactionId: transactionId,
    sourceReference: transactionRef,
    feeType,
    description: `Frais plateforme ${feeType ? `${feeType} ` : ""}sur ${transactionRef}`,
  });

  // Équivalent Pi purement indicatif (dashboards) — n'affecte aucun solde.
  let convertedPi = 0;
  let conversionRate = 0;
  try {
    const piPrice = await getPiPrice();
    conversionRate = getConversionRate(currency, piPrice);
    convertedPi =
      currency === "PI"
        ? credit.amount
        : roundFee(toUsd(credit.amount, currency, piPrice) / (piPrice || 1), "PI");
  } catch {
    // Valorisation indisponible : sans impact sur l'encaissement.
  }

  return {
    success: credit.success,
    originalAmount: credit.amount,
    originalCurrency: currency,
    convertedPi,
    conversionRate,
    transactionRef,
    alreadyCollected: credit.alreadyCollected,
    error: credit.error,
  };
}

/** Alias explicite, à préférer dans le nouveau code. */
export const collectPlatformFee = autoConvertFeeToPi;

/* ------------------------------------------------------------------ */
/*  RATTRAPAGE                                                         */
/* ------------------------------------------------------------------ */

/**
 * Rattrape tous les frais réussis qui n'ont pas encore été crédités au
 * wallet opérateur (historique ou incident réseau).
 */
export async function batchConvertPendingFees(limit = 500): Promise<{
  processed: number;
  converted: number;
  totalPi: number;
  errors: number;
}> {
  const sweep = await sweepUncollectedFees(limit);

  // Valorisation Pi indicative du montant rattrapé.
  let totalPi = 0;
  try {
    const piPrice = await getPiPrice();
    for (const [currency, amount] of Object.entries(sweep.totalsByCurrency)) {
      totalPi +=
        currency === "PI"
          ? amount
          : toUsd(amount, currency, piPrice) / (piPrice || 1);
    }
  } catch {
    // sans impact
  }

  return {
    processed: sweep.scanned,
    converted: sweep.collected,
    totalPi,
    errors: sweep.failed,
  };
}

/** Nombre de frais réussis encore non encaissés (supervision admin). */
export async function countUncollectedFees(): Promise<number> {
  const withFees = await prisma.transaction.count({
    where: {
      fee: { gt: 0 },
      status: "SUCCESS",
      type: { notIn: ["FEE_COLLECTION", "FEE_CONVERSION"] },
    },
  });
  const collected = await prisma.transaction.count({
    where: { type: "FEE_COLLECTION", status: "SUCCESS" },
  });
  return Math.max(0, withFees - collected);
}
