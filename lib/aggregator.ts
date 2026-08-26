// lib/aggregator.ts
// -----------------------------------------------------------------------------
// Routeur d'agrégateur Mobile Money PARTAGE (safe côté client ET serveur).
//
// Stratégie retenue : GeniusPay PRIMAIRE, PawaPay en SECOURS.
//   1. Si le pays + opérateur sont couverts par GeniusPay (zone XOF / UEMOA)
//      -> on route vers GeniusPay.
//   2. Sinon, si PawaPay couvre le pays + opérateur -> on route vers PawaPay.
//   3. Sinon -> non supporté.
//
// Ce module n'importe que les catalogues (aucun secret, aucun appel réseau,
// aucun import Node) : il peut donc être utilisé directement dans les pages
// client pour choisir le bon endpoint API, comme côté serveur.
// -----------------------------------------------------------------------------

import {
  resolveGeniusPay,
  isGeniusPayCountrySupported,
  type GeniusPayMomoMethod,
} from "./geniuspay-catalog";
import {
  resolveProvider,
  isCountrySupported as isPawaPayCountrySupported,
} from "./pawapay-catalog";

export type AggregatorName = "GENIUSPAY" | "PAWAPAY";

export interface AggregatorResolution {
  /** Agrégateur retenu, ou null si aucun ne prend en charge ce couple pays/opérateur. */
  aggregator: AggregatorName | null;
  supported: boolean;
  /** Devise locale résolue (dynamique selon le pays). */
  currency: string;
  /** Moyen de paiement GeniusPay (présent uniquement si aggregator === "GENIUSPAY"). */
  method?: GeniusPayMomoMethod;
  /** Code provider PawaPay (présent uniquement si aggregator === "PAWAPAY"). */
  provider?: string;
}

/**
 * Résout l'agrégateur à utiliser pour un pays (alpha-2) + un opérateur.
 * GeniusPay est prioritaire ; PawaPay sert de repli.
 */
export function resolveAggregator(
  countryCode: string,
  operatorHint: string
): AggregatorResolution {
  const gp = resolveGeniusPay(countryCode, operatorHint);
  const pp = resolveProvider(countryCode, operatorHint);

  // 1. GeniusPay avec PUSH Mobile Money natif (Côte d'Ivoire : wave /
  //    orange_money / mtn_money / moov_money). C'est le seul cas où GeniusPay
  //    peut réellement router un paiement Mobile Money vers l'opérateur.
  if (gp.supported && gp.method) {
    return {
      aggregator: "GENIUSPAY",
      supported: true,
      currency: gp.currency,
      method: gp.method,
    };
  }

  // 2. GeniusPay avec le rail PawaPay intégré pour les marchés hors CI.
  //    Le Burkina Faso doit impérativement utiliser GeniusPay comme point
  //    d'entrée production : `pawapay` est envoyé à GeniusPay avec le code
  //    opérateur ORANGE_BFA/MOOV_BFA. L'application ne contacte jamais
  //    directement l'API PawaPay pour ce flux.
  if (gp.supported && pp.supported && pp.provider) {
    return {
      aggregator: "GENIUSPAY",
      supported: true,
      currency: gp.currency || pp.currency,
      provider: pp.provider,
    };
  }

  // 3. PawaPay direct reste disponible uniquement pour les pays qui ne sont
  //    pas couverts par GeniusPay et pour les flux legacy déjà existants.
  if (!gp.supported && pp.supported && pp.provider) {
    return {
      aggregator: "PAWAPAY",
      supported: true,
      currency: pp.currency,
      provider: pp.provider,
    };
  }

  // 4. Repli GeniusPay : checkout hébergé (carte) quand la devise est
  //    compatible mais qu'aucun rail Mobile Money natif n'est disponible
  //    (ex. Coris Money au Burkina Faso, Togo, Niger…).
  if (gp.supported) {
    return {
      aggregator: "GENIUSPAY",
      supported: true,
      currency: gp.currency,
      method: gp.method,
    };
  }

  // 4. Non supporté
  return {
    aggregator: null,
    supported: false,
    currency: gp.currency || pp.currency || "",
  };
}

/** true si au moins un agrégateur (GeniusPay ou PawaPay) couvre ce pays. */
export function isAnyCountrySupported(countryCode: string): boolean {
  return (
    isGeniusPayCountrySupported(countryCode) ||
    isPawaPayCountrySupported(countryCode)
  );
}

/** true si un agrégateur prend en charge ce couple pays / opérateur. */
export function isAnyOperatorSupported(
  countryCode: string,
  operatorHint: string
): boolean {
  return resolveAggregator(countryCode, operatorHint).supported;
}

/**
 * Filtre une liste d'opérateurs génériques pour ne conserver que ceux pris en
 * charge par au moins un agrégateur (GeniusPay ou PawaPay) dans ce pays.
 */
export function filterSupportedOperatorsAny<
  T extends { id: string; name: string }
>(countryCode: string, operators: T[]): T[] {
  return (operators || []).filter((op) =>
    isAnyOperatorSupported(countryCode, `${op.id || ""} ${op.name || ""}`)
  );
}
