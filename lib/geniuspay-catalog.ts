// lib/geniuspay-catalog.ts
// -----------------------------------------------------------------------------
// Catalogue GeniusPay PARTAGE (safe côté client ET serveur).
//
// Ce module ne contient AUCUN secret ni appel réseau ni import Node (pas de
// `crypto`) : uniquement la couverture pays de GeniusPay, le mapping opérateur
// -> moyen de paiement Mobile Money, et des helpers de résolution / filtrage.
// Il est la SOURCE DE VÉRITÉ unique utilisée par :
//   - lib/geniuspay.ts        (serveur : createPayment / createPayout)
//   - lib/aggregator.ts       (routeur GeniusPay ⇄ PawaPay)
//   - pages dépôt / retrait / transfert / cartes (client : filtrage opérateurs)
//
// STRATÉGIE (UNIVERSELLE) :
//   GeniusPay est désormais l'agrégateur par défaut pour TOUS les pays de
//   l'application (Nigeria, Kenya, etc. compris). La devise est TOUJOURS la
//   devise locale du pays (NGN, KES, XOF, ...), résolue dynamiquement depuis le
//   catalogue pays de l'app (lib/country-data) — jamais codée en dur.
//
//   - Dans la zone Mobile Money native de GeniusPay (UEMOA / XOF : Wave, Orange
//     Money, MTN MoMo, Moov Money), un opérateur reconnu déclenche un push
//     Mobile Money.
//   - Partout ailleurs (ou pour un opérateur non reconnu), on retombe sur la
//     page de paiement hébergée GeniusPay (checkout carte) : `method` vaut alors
//     `undefined`, ce que les routes serveur interprètent comme « checkout ».
// -----------------------------------------------------------------------------

import { countries } from "./country-data";

// -----------------------------------------------------------------------------
// Moyens de paiement Mobile Money supportés par GeniusPay
// -----------------------------------------------------------------------------
// Codes EXACTS attendus par le paramètre `payment_method` de l'API GeniusPay
// (cf. doc officielle https://geniuspay.ci/docs/api → « Méthodes de paiement »).
export const GENIUSPAY_MOMO_METHODS = [
  "wave",
  "orange_money",
  "mtn_money",
  "moov_money",
  "airtel_money",
] as const;
export type GeniusPayMomoMethod = (typeof GENIUSPAY_MOMO_METHODS)[number];

/**
 * Résout un `payment_method` GeniusPay à partir d'un libellé d'opérateur libre.
 * Retourne `undefined` si aucun opérateur ne correspond (-> checkout carte).
 *
 * NB : les codes renvoyés sont ceux EXACTS de l'API GeniusPay
 * (`orange_money`, `mtn_money`, `moov_money`, `airtel_money`, `wave`).
 */
export function resolveMomoMethod(
  operator?: string | null
): GeniusPayMomoMethod | undefined {
  const s = (operator || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("wave")) return "wave";
  if (s.includes("orange") || s.includes("om")) return "orange_money";
  if (s.includes("airtel")) return "airtel_money";
  if (s.includes("mtn") || s.includes("momo")) return "mtn_money";
  if (s.includes("moov") || s.includes("flooz")) return "moov_money";
  return undefined;
}

// -----------------------------------------------------------------------------
// Zone Mobile Money NATIVE de GeniusPay (UEMOA / XOF).
// Dans ces pays, un opérateur reconnu déclenche un push Mobile Money.
// Ailleurs, GeniusPay traite le paiement via sa page de checkout (carte).
// -----------------------------------------------------------------------------
export interface GeniusPayCountry {
  alpha3: string;
  currency: string;
}

export const GENIUSPAY_MOMO_COUNTRIES: Record<string, GeniusPayCountry> = {
  CI: { alpha3: "CIV", currency: "XOF" }, // Côte d'Ivoire
  SN: { alpha3: "SEN", currency: "XOF" }, // Sénégal
  BJ: { alpha3: "BEN", currency: "XOF" }, // Bénin
  BF: { alpha3: "BFA", currency: "XOF" }, // Burkina Faso
  ML: { alpha3: "MLI", currency: "XOF" }, // Mali
  TG: { alpha3: "TGO", currency: "XOF" }, // Togo
  NE: { alpha3: "NER", currency: "XOF" }, // Niger
  GW: { alpha3: "GNB", currency: "XOF" }, // Guinée-Bissau
  CG: { alpha3: "COG", currency: "XAF" }, // Congo (Brazzaville) — via GeniusPay
};

/**
 * @deprecated Conservé pour compatibilité. Utilisez `GENIUSPAY_MOMO_COUNTRIES`
 * pour la zone Mobile Money native, et les helpers universels ci-dessous pour
 * la couverture pays complète.
 */
export const GENIUSPAY_COUNTRIES = GENIUSPAY_MOMO_COUNTRIES;

// -----------------------------------------------------------------------------
// Carte pays -> devise locale, construite depuis le catalogue pays de l'app
// (source de vérité unique). GeniusPay étant universel, tout pays connu de
// l'application est pris en charge dans sa devise locale.
// -----------------------------------------------------------------------------
const COUNTRY_CURRENCY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of countries || []) {
    if (c?.code && c?.currency) map[c.code.toUpperCase()] = c.currency;
  }
  // Filet de sécurité : garantir la présence de la zone Mobile Money native.
  for (const [cc, info] of Object.entries(GENIUSPAY_MOMO_COUNTRIES)) {
    if (!map[cc]) map[cc] = info.currency;
  }
  return map;
})();

export interface ResolvedGeniusPay {
  /** Moyen de paiement Mobile Money (undefined => carte / checkout hébergé). */
  method?: GeniusPayMomoMethod;
  currency: string; // devise locale du pays (NGN, KES, XOF, ...)
  alpha3: string; // code pays ISO alpha-3 (rempli pour la zone MoMo native)
  /** true si le pays est pris en charge par GeniusPay (universel). */
  supported: boolean;
}

/** true si le pays (alpha-2) fait partie de la zone Mobile Money native. */
function isMomoZone(countryCode: string): boolean {
  return !!GENIUSPAY_MOMO_COUNTRIES[(countryCode || "").toUpperCase()];
}

/**
 * Résout la configuration GeniusPay pour un pays (alpha-2) + un opérateur donné.
 *
 * GeniusPay étant universel, `supported` est vrai dès que le pays est connu de
 * l'application (devise locale disponible). Le moyen de paiement Mobile Money
 * n'est renseigné que dans la zone MoMo native (UEMOA / XOF) ET si l'opérateur
 * est reconnu ; sinon `method` reste `undefined` et le paiement passe par le
 * checkout carte hébergé de GeniusPay (repli carte).
 */
export function resolveGeniusPay(
  countryCode: string,
  operatorHint: string
): ResolvedGeniusPay {
  const cc = (countryCode || "").toUpperCase();
  const currency = COUNTRY_CURRENCY[cc] || "";
  if (!currency) {
    return { currency: "", alpha3: "", supported: false };
  }
  const method = isMomoZone(cc) ? resolveMomoMethod(operatorHint) : undefined;
  return {
    method,
    currency,
    alpha3: GENIUSPAY_MOMO_COUNTRIES[cc]?.alpha3 || "",
    supported: true, // universel : repli carte si aucun moyen MoMo
  };
}

/** true si le pays (alpha-2) est pris en charge par GeniusPay (universel). */
export function isGeniusPayCountrySupported(countryCode: string): boolean {
  return !!COUNTRY_CURRENCY[(countryCode || "").toUpperCase()];
}

/** Devise locale GeniusPay d'un pays (NGN, KES, XOF, ...), sinon "". */
export function getGeniusPayCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY[(countryCode || "").toUpperCase()] || "";
}

/**
 * true si l'opérateur (id/nom) est pris en charge par GeniusPay dans ce pays.
 * GeniusPay étant universel (repli carte), cela équivaut à la prise en charge
 * du pays lui-même.
 */
export function isGeniusPayOperatorSupported(
  countryCode: string,
  operatorHint: string
): boolean {
  return resolveGeniusPay(countryCode, operatorHint).supported;
}
