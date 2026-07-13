// lib/geniuspay-catalog.ts
// -----------------------------------------------------------------------------
// Catalogue GeniusPay PARTAGE (safe côté client ET serveur).
//
// Ce module ne contient AUCUN secret ni appel réseau ni import Node (pas de
// `crypto`) : uniquement la table des pays de la zone UEMOA (XOF) pris en charge
// par GeniusPay, le mapping opérateur -> moyen de paiement Mobile Money, et des
// helpers de résolution / filtrage. Il est la SOURCE DE VÉRITÉ unique utilisée
// par :
//   - lib/geniuspay.ts        (serveur : createPayment / createPayout)
//   - lib/aggregator.ts       (routeur GeniusPay ⇄ PawaPay)
//   - pages dépôt / retrait / transfert / cartes (client : filtrage opérateurs)
//
// GeniusPay est un agrégateur de la zone Franc CFA Ouest-Africain (XOF) :
// Wave, Orange Money, MTN MoMo et Moov Money. Toutes les devises couvertes sont
// donc XOF, mais la devise est résolue dynamiquement depuis le pays sélectionné
// (jamais codée en dur) afin de rester correcte si le catalogue évolue.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Moyens de paiement Mobile Money supportés par GeniusPay
// -----------------------------------------------------------------------------
export const GENIUSPAY_MOMO_METHODS = [
  "wave",
  "orange_money",
  "mtn",
  "moov",
] as const;
export type GeniusPayMomoMethod = (typeof GENIUSPAY_MOMO_METHODS)[number];

/**
 * Résout un `payment_method` GeniusPay à partir d'un libellé d'opérateur libre.
 * Retourne `undefined` si aucun opérateur ne correspond (-> checkout carte).
 */
export function resolveMomoMethod(
  operator?: string | null
): GeniusPayMomoMethod | undefined {
  const s = (operator || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("wave")) return "wave";
  if (s.includes("orange") || s.includes("om")) return "orange_money";
  if (s.includes("mtn") || s.includes("momo")) return "mtn";
  if (s.includes("moov") || s.includes("flooz")) return "moov";
  return undefined;
}

// -----------------------------------------------------------------------------
// Table des pays de la zone XOF pris en charge par GeniusPay :
//   code ISO alpha-2 -> { alpha3, currency }
// -----------------------------------------------------------------------------
export interface GeniusPayCountry {
  alpha3: string;
  currency: string;
}

export const GENIUSPAY_COUNTRIES: Record<string, GeniusPayCountry> = {
  CI: { alpha3: "CIV", currency: "XOF" }, // Côte d'Ivoire
  SN: { alpha3: "SEN", currency: "XOF" }, // Sénégal
  BJ: { alpha3: "BEN", currency: "XOF" }, // Bénin
  BF: { alpha3: "BFA", currency: "XOF" }, // Burkina Faso
  ML: { alpha3: "MLI", currency: "XOF" }, // Mali
  TG: { alpha3: "TGO", currency: "XOF" }, // Togo
  NE: { alpha3: "NER", currency: "XOF" }, // Niger
  GW: { alpha3: "GNB", currency: "XOF" }, // Guinée-Bissau
};

export interface ResolvedGeniusPay {
  /** Moyen de paiement Mobile Money (undefined => carte / checkout hébergé). */
  method?: GeniusPayMomoMethod;
  currency: string; // devise du pays (XOF pour la zone couverte)
  alpha3: string; // code pays ISO alpha-3
  /** true si le pays ET l'opérateur sont pris en charge par GeniusPay. */
  supported: boolean;
}

/**
 * Résout la configuration GeniusPay pour un pays (alpha-2) + un opérateur donné.
 * `supported` est vrai uniquement si le pays est couvert par GeniusPay ET que
 * l'opérateur correspond à un moyen Mobile Money GeniusPay (wave / orange_money
 * / mtn / moov). Si l'opérateur n'est pas reconnu, `supported` est faux afin que
 * le routeur d'agrégateur puisse retomber sur PawaPay.
 */
export function resolveGeniusPay(
  countryCode: string,
  operatorHint: string
): ResolvedGeniusPay {
  const cc = (countryCode || "").toUpperCase();
  const country = GENIUSPAY_COUNTRIES[cc];
  if (!country) {
    return { currency: "", alpha3: "", supported: false };
  }
  const method = resolveMomoMethod(operatorHint);
  return {
    method,
    currency: country.currency,
    alpha3: country.alpha3,
    supported: !!method,
  };
}

/** true si le pays (alpha-2) est couvert par GeniusPay (zone XOF). */
export function isGeniusPayCountrySupported(countryCode: string): boolean {
  return !!GENIUSPAY_COUNTRIES[(countryCode || "").toUpperCase()];
}

/** Devise GeniusPay d'un pays (XOF pour la zone couverte), sinon "". */
export function getGeniusPayCurrency(countryCode: string): string {
  return GENIUSPAY_COUNTRIES[(countryCode || "").toUpperCase()]?.currency || "";
}

/**
 * true si l'opérateur (id/nom) est pris en charge par GeniusPay dans ce pays.
 * Utilisé côté client pour n'afficher que les opérateurs réellement supportés.
 */
export function isGeniusPayOperatorSupported(
  countryCode: string,
  operatorHint: string
): boolean {
  return resolveGeniusPay(countryCode, operatorHint).supported;
}
