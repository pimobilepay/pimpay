// lib/aggregator-client.ts
// -----------------------------------------------------------------------------
// Helpers CLIENT pour router une opération Mobile Money vers le bon endpoint API
// selon l'agrégateur résolu (GeniusPay primaire, PawaPay secours).
//
// Ce module s'appuie exclusivement sur lib/aggregator.ts (qui n'importe que les
// catalogues, sans secret ni appel réseau) : il est donc 100% safe côté client.
//
// Chaque opération (dépôt / retrait / transfert / recharge carte) possède ses
// propres endpoints GeniusPay et PawaPay/legacy. `resolveEndpoint` choisit le
// bon selon le couple pays + opérateur sélectionné par l'utilisateur.
// -----------------------------------------------------------------------------

import {
  resolveAggregator,
  type AggregatorName,
  type AggregatorResolution,
} from "./aggregator";

export type AggregatorOperation =
  | "deposit"
  | "withdraw"
  | "transfer"
  | "card_fund";

// Table des endpoints par opération et par agrégateur.
// La branche PAWAPAY conserve les endpoints legacy déjà en place dans l'app.
const ENDPOINTS: Record<
  AggregatorOperation,
  Record<AggregatorName, string>
> = {
  deposit: {
    GENIUSPAY: "/api/transaction/deposit/geniuspay",
    PAWAPAY: "/api/transaction/deposit/pawapay",
  },
  withdraw: {
    GENIUSPAY: "/api/transaction/withdraw/geniuspay",
    PAWAPAY: "/api/transaction/withdraw",
  },
  transfer: {
    GENIUSPAY: "/api/transaction/transfer/geniuspay",
    PAWAPAY: "/api/transaction/transfer/mobile",
  },
  card_fund: {
    GENIUSPAY: "/api/transaction/card/fund/geniuspay",
    PAWAPAY: "/api/transaction/card/fund",
  },
};

export interface ResolvedEndpoint extends AggregatorResolution {
  /** URL de l'endpoint API à appeler, ou null si non supporté. */
  endpoint: string | null;
  operation: AggregatorOperation;
}

/**
 * Résout l'endpoint API à appeler pour une opération donnée en fonction du pays
 * (alpha-2) et de l'opérateur sélectionné. Utilise GeniusPay en priorité, puis
 * PawaPay/legacy en repli. Renvoie `endpoint: null` si aucun agrégateur ne
 * prend en charge ce couple pays / opérateur.
 */
export function resolveEndpoint(
  operation: AggregatorOperation,
  countryCode: string,
  operatorHint: string
): ResolvedEndpoint {
  const resolution = resolveAggregator(countryCode, operatorHint);
  const endpoint = resolution.aggregator
    ? ENDPOINTS[operation][resolution.aggregator]
    : null;
  return { ...resolution, endpoint, operation };
}
