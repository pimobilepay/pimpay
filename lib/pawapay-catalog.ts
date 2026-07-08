// lib/pawapay-catalog.ts
// -----------------------------------------------------------------------------
// Catalogue PawaPay PARTAGE (safe cote client ET serveur).
//
// Ce module ne contient AUCUN secret ni appel reseau : uniquement la table des
// pays supportes par PawaPay, le mapping opérateur -> provider, et des helpers
// de resolution / filtrage. Il est la SOURCE DE VERITE unique utilisee par :
//   - lib/pawapay.ts        (serveur : requestDeposit / requestPayout)
//   - app/deposit/page.tsx  (client : filtrage des operateurs affiches)
//
// Liste des 20 pays officiellement pris en charge par PawaPay :
//   Benin, Burkina Faso, Cameroon, Cote d'Ivoire, DRC, Ethiopia, Gabon, Ghana,
//   Kenya, Lesotho, Malawi, Mozambique, Nigeria, Republic of the Congo, Rwanda,
//   Senegal, Sierra Leone, Tanzania, Uganda, Zambia.
// -----------------------------------------------------------------------------

export interface PawaPayCountry {
  alpha3: string;
  currency: string;
}

// -----------------------------------------------------------------------------
// Table des pays supportés par PawaPay : code ISO alpha-2 -> { alpha3, currency }
// -----------------------------------------------------------------------------
export const PAWAPAY_COUNTRIES: Record<string, PawaPayCountry> = {
  BJ: { alpha3: "BEN", currency: "XOF" }, // Bénin
  BF: { alpha3: "BFA", currency: "XOF" }, // Burkina Faso
  CM: { alpha3: "CMR", currency: "XAF" }, // Cameroun
  CG: { alpha3: "COG", currency: "XAF" }, // Congo Brazzaville
  CD: { alpha3: "COD", currency: "CDF" }, // RDC
  CI: { alpha3: "CIV", currency: "XOF" }, // Côte d'Ivoire
  ET: { alpha3: "ETH", currency: "ETB" }, // Éthiopie
  GA: { alpha3: "GAB", currency: "XAF" }, // Gabon
  GH: { alpha3: "GHA", currency: "GHS" }, // Ghana
  KE: { alpha3: "KEN", currency: "KES" }, // Kenya
  LS: { alpha3: "LSO", currency: "LSL" }, // Lesotho
  MW: { alpha3: "MWI", currency: "MWK" }, // Malawi
  MZ: { alpha3: "MOZ", currency: "MZN" }, // Mozambique
  NG: { alpha3: "NGA", currency: "NGN" }, // Nigeria
  RW: { alpha3: "RWA", currency: "RWF" }, // Rwanda
  SN: { alpha3: "SEN", currency: "XOF" }, // Sénégal
  SL: { alpha3: "SLE", currency: "SLE" }, // Sierra Leone
  TZ: { alpha3: "TZA", currency: "TZS" }, // Tanzanie
  UG: { alpha3: "UGA", currency: "UGX" }, // Ouganda
  ZM: { alpha3: "ZMB", currency: "ZMW" }, // Zambie
};

// -----------------------------------------------------------------------------
// Mapping opérateur -> code provider PawaPay.
// La clé est le code pays alpha-2 ; pour chaque pays, on associe des mots-clés de
// marque (présents dans l'id/nom de l'opérateur de l'app) au code provider PawaPay.
// -----------------------------------------------------------------------------
export interface ProviderRule {
  keywords: string[]; // mots-clés recherchés dans l'id/nom opérateur (minuscule)
  provider: string; // code provider PawaPay
}

export const PROVIDER_RULES: Record<string, ProviderRule[]> = {
  BJ: [
    { keywords: ["mtn"], provider: "MTN_MOMO_BEN" },
    { keywords: ["moov"], provider: "MOOV_BEN" },
  ],
  BF: [
    { keywords: ["moov"], provider: "MOOV_BFA" },
    { keywords: ["orange"], provider: "ORANGE_BFA" },
  ],
  CM: [
    { keywords: ["mtn"], provider: "MTN_MOMO_CMR" },
    { keywords: ["orange"], provider: "ORANGE_CMR" },
  ],
  CG: [
    { keywords: ["mtn"], provider: "MTN_MOMO_COG" },
    { keywords: ["airtel"], provider: "AIRTEL_COG" },
  ],
  CD: [
    { keywords: ["vodacom", "mpesa", "m-pesa"], provider: "VODACOM_MPESA_COD" },
    { keywords: ["airtel"], provider: "AIRTEL_COD" },
    { keywords: ["orange"], provider: "ORANGE_COD" },
  ],
  CI: [
    { keywords: ["mtn"], provider: "MTN_MOMO_CIV" },
    { keywords: ["orange"], provider: "ORANGE_CIV" },
    { keywords: ["moov"], provider: "MOOV_CIV" },
    { keywords: ["wave"], provider: "WAVE_CIV" },
  ],
  ET: [{ keywords: ["mpesa", "m-pesa", "safaricom"], provider: "MPESA_ETH" }],
  GA: [{ keywords: ["airtel"], provider: "AIRTEL_GAB" }],
  GH: [
    { keywords: ["mtn"], provider: "MTN_MOMO_GHA" },
    { keywords: ["airteltigo", "tigo", "airtel"], provider: "AIRTELTIGO_GHA" },
    { keywords: ["vodafone", "telecel"], provider: "VODAFONE_GHA" },
  ],
  KE: [
    { keywords: ["mpesa", "m-pesa", "safaricom"], provider: "MPESA_KEN" },
    { keywords: ["airtel"], provider: "AIRTEL_KEN" },
  ],
  LS: [{ keywords: ["mpesa", "m-pesa", "vodacom"], provider: "MPESA_LSO" }],
  MW: [
    { keywords: ["airtel"], provider: "AIRTEL_MWI" },
    { keywords: ["tnm", "mpamba"], provider: "TNM_MWI" },
  ],
  MZ: [
    { keywords: ["vodacom", "mpesa", "m-pesa"], provider: "VODACOM_MOZ" },
    { keywords: ["movitel"], provider: "MOVITEL_MOZ" },
  ],
  NG: [
    { keywords: ["mtn"], provider: "MTN_MOMO_NGA" },
    { keywords: ["airtel"], provider: "AIRTEL_NGA" },
  ],
  RW: [
    { keywords: ["mtn"], provider: "MTN_MOMO_RWA" },
    { keywords: ["airtel"], provider: "AIRTEL_RWA" },
  ],
  SN: [
    { keywords: ["free"], provider: "FREE_SEN" },
    { keywords: ["orange"], provider: "ORANGE_SEN" },
    { keywords: ["expresso"], provider: "EXPRESSO_SEN" },
    { keywords: ["wave"], provider: "WAVE_SEN" },
  ],
  SL: [
    { keywords: ["orange"], provider: "ORANGE_SLE" },
    { keywords: ["africell"], provider: "AFRICELL_SLE" },
  ],
  TZ: [
    { keywords: ["airtel"], provider: "AIRTEL_TZA" },
    { keywords: ["vodacom", "mpesa", "m-pesa"], provider: "VODACOM_TZA" },
    { keywords: ["tigo", "mixx", "yas"], provider: "TIGO_TZA" },
    { keywords: ["halotel", "halo"], provider: "HALOTEL_TZA" },
  ],
  UG: [
    { keywords: ["mtn"], provider: "MTN_MOMO_UGA" },
    { keywords: ["airtel"], provider: "AIRTEL_UGA" },
  ],
  ZM: [
    { keywords: ["mtn"], provider: "MTN_MOMO_ZMB" },
    { keywords: ["airtel"], provider: "AIRTEL_OAPI_ZMB" },
    { keywords: ["zamtel"], provider: "ZAMTEL_ZMB" },
  ],
};

export interface ResolvedProvider {
  provider: string; // code provider PawaPay (ex: MTN_MOMO_ZMB)
  currency: string; // devise du pays (ex: ZMW)
  alpha3: string; // code pays ISO alpha-3 (ex: ZMB)
  supported: boolean; // true si le pays/opérateur est pris en charge par PawaPay
}

/**
 * Résout un provider PawaPay à partir du code pays (alpha-2) et de l'opérateur
 * sélectionné dans l'app (id ou nom, ex: "mtn_zm", "MTN MoMo", "airtel_ng").
 *
 * IMPORTANT : le repli sur le premier provider n'est fait QUE si le pays ne
 * possède qu'un seul provider PawaPay. Pour les pays multi-opérateurs, un
 * opérateur non reconnu est marqué `supported: false` afin d'éviter d'envoyer
 * le dépôt vers le mauvais provider (ce qui provoquait des erreurs du type
 * « account has not been configured to make deposits using 'AIRTEL_NGA' »).
 */
export function resolveProvider(
  countryCode: string,
  operatorHint: string
): ResolvedProvider {
  const cc = (countryCode || "").toUpperCase();
  const country = PAWAPAY_COUNTRIES[cc];
  const hint = (operatorHint || "").toLowerCase();

  if (!country) {
    return { provider: "", currency: "", alpha3: "", supported: false };
  }

  const rules = PROVIDER_RULES[cc] || [];
  let match = rules.find((r) => r.keywords.some((k) => hint.includes(k)));

  // Repli UNIQUEMENT si le pays a un seul provider possible.
  if (!match && rules.length === 1) {
    match = rules[0];
  }

  if (!match) {
    return {
      provider: "",
      currency: country.currency,
      alpha3: country.alpha3,
      supported: false,
    };
  }

  return {
    provider: match.provider,
    currency: country.currency,
    alpha3: country.alpha3,
    supported: true,
  };
}

/** true si le pays (alpha-2) est pris en charge par PawaPay. */
export function isCountrySupported(countryCode: string): boolean {
  return !!PAWAPAY_COUNTRIES[(countryCode || "").toUpperCase()];
}

/** Renvoie les règles de providers PawaPay pour un pays donné. */
export function getSupportedProviders(countryCode: string): ProviderRule[] {
  return PROVIDER_RULES[(countryCode || "").toUpperCase()] || [];
}

/**
 * true si l'opérateur (id/nom) correspond à un provider PawaPay pour ce pays.
 * Utilisé côté client pour n'afficher que les opérateurs réellement supportés.
 */
export function isOperatorSupported(
  countryCode: string,
  operatorHint: string
): boolean {
  const resolved = resolveProvider(countryCode, operatorHint);
  return resolved.supported && !!resolved.provider;
}

/**
 * Filtre une liste d'opérateurs (générique) pour ne conserver que ceux pris en
 * charge par PawaPay dans le pays donné.
 */
export function filterSupportedOperators<
  T extends { id: string; name: string }
>(countryCode: string, operators: T[]): T[] {
  return (operators || []).filter((op) =>
    isOperatorSupported(countryCode, `${op.id || ""} ${op.name || ""}`)
  );
}
