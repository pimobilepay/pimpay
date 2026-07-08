// lib/pawapay.ts
// -----------------------------------------------------------------------------
// Client d'intégration PawaPay (Merchant API v2)
//
// PawaPay est l'agrégateur Mobile Money utilisé pour :
//   - DÉPÔT     : POST /v2/deposits  (collecte / "cash-in" depuis le MoMo du client)
//   - RETRAIT   : POST /v2/payouts   (payout vers le MoMo du client)
//   - TRANSFERT : POST /v2/payouts   (payout vers le MoMo d'un bénéficiaire externe)
//
// Authentification : header `Authorization: Bearer <PAWAPAY_API_TOKEN>`.
// Les tokens sandbox et production sont DIFFÉRENTS (cf. doc PawaPay).
//
// Variables d'environnement attendues :
//   PAWAPAY_API_TOKEN  - Token bearer (généré depuis le dashboard PawaPay)
//   PAWAPAY_ENV        - "sandbox" (défaut) ou "production"
//   NEXT_PUBLIC_APP_URL - URL publique de l'app (pour construire les callback URLs)
// -----------------------------------------------------------------------------

export type PawaPayEnv = "sandbox" | "production";

export function getPawaPayEnv(): PawaPayEnv {
  return (process.env.PAWAPAY_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function getPawaPayBaseUrl(): string {
  return getPawaPayEnv() === "production"
    ? "https://api.pawapay.io"
    : "https://api.sandbox.pawapay.io";
}

function getToken(): string {
  const token = process.env.PAWAPAY_API_TOKEN;
  if (!token) {
    throw new Error(
      "PAWAPAY_API_TOKEN non configuré. Ajoutez-le dans les variables d'environnement du projet."
    );
  }
  return token;
}

/** URL de base publique de l'app, pour construire les callback URLs des webhooks. */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://pimpay.vercel.app"
  ).replace(/\/$/, "");
}

// -----------------------------------------------------------------------------
// Appel HTTP générique vers l'API PawaPay
// -----------------------------------------------------------------------------
export interface PawaPayResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function pawapayFetch<T = any>(
  path: string,
  init?: RequestInit
): Promise<PawaPayResponse<T>> {
  const url = `${getPawaPayBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    // Ne jamais mettre en cache les appels à l'agrégateur
    cache: "no-store",
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

// -----------------------------------------------------------------------------
// Normalisation du numéro (MSISDN)
// PawaPay attend un numéro au format international SANS "+", chiffres uniquement.
// ex: "+260 76 345 6789" -> "260763456789"
// -----------------------------------------------------------------------------
export function normalizeMsisdn(input: string): string {
  return (input || "").replace(/\D/g, "");
}

// -----------------------------------------------------------------------------
// Génération d'un identifiant UUID v4 (requis pour depositId / payoutId).
// -----------------------------------------------------------------------------
export function newPawaPayId(): string {
  // crypto.randomUUID est disponible dans le runtime Node de Next.js
  return crypto.randomUUID();
}

// -----------------------------------------------------------------------------
// Table des pays supportés par PawaPay : code ISO alpha-2 -> { alpha3, currency }
// -----------------------------------------------------------------------------
interface PawaPayCountry {
  alpha3: string;
  currency: string;
}

const PAWAPAY_COUNTRIES: Record<string, PawaPayCountry> = {
  BJ: { alpha3: "BEN", currency: "XOF" }, // Bénin
  BF: { alpha3: "BFA", currency: "XOF" }, // Burkina Faso
  CM: { alpha3: "CMR", currency: "XAF" }, // Cameroun
  CG: { alpha3: "COG", currency: "XAF" }, // Congo Brazzaville
  CD: { alpha3: "COD", currency: "CDF" }, // RDC
  CI: { alpha3: "CIV", currency: "XOF" }, // Côte d'Ivoire
  GA: { alpha3: "GAB", currency: "XAF" }, // Gabon
  GH: { alpha3: "GHA", currency: "GHS" }, // Ghana
  KE: { alpha3: "KEN", currency: "KES" }, // Kenya
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
interface ProviderRule {
  keywords: string[]; // mots-clés recherchés dans l'id/nom opérateur (minuscule)
  provider: string; // code provider PawaPay
}

const PROVIDER_RULES: Record<string, ProviderRule[]> = {
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
  MW: [
    { keywords: ["airtel"], provider: "AIRTEL_MWI" },
    { keywords: ["tnm"], provider: "TNM_MWI" },
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

  // Repli : si aucun mot-clé ne matche mais le pays n'a qu'un seul provider,
  // on prend le premier disponible.
  if (!match && rules.length > 0) {
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

export function isCountrySupported(countryCode: string): boolean {
  return !!PAWAPAY_COUNTRIES[(countryCode || "").toUpperCase()];
}

// -----------------------------------------------------------------------------
// DÉPÔT (collecte) : POST /v2/deposits
// -----------------------------------------------------------------------------
export interface RequestDepositParams {
  depositId: string;
  amount: string; // montant en devise locale, string sans séparateur (ex: "100")
  currency: string; // ex: "ZMW"
  phoneNumber: string; // MSISDN normalisé (sans +)
  provider: string; // code provider PawaPay
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export async function requestDeposit(params: RequestDepositParams) {
  const body: any = {
    depositId: params.depositId,
    amount: params.amount,
    currency: params.currency,
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: normalizeMsisdn(params.phoneNumber),
        provider: params.provider,
      },
    },
  };
  if (params.callbackUrl) body.callbackUrl = params.callbackUrl;
  if (params.metadata) {
    body.metadata = Object.entries(params.metadata).map(([k, v]) => ({
      [k]: String(v),
    }));
  }
  return pawapayFetch("/v2/deposits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// -----------------------------------------------------------------------------
// PAYOUT (retrait / transfert vers Mobile Money) : POST /v2/payouts
// -----------------------------------------------------------------------------
export interface RequestPayoutParams {
  payoutId: string;
  amount: string;
  currency: string;
  phoneNumber: string;
  provider: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export async function requestPayout(params: RequestPayoutParams) {
  const body: any = {
    payoutId: params.payoutId,
    amount: params.amount,
    currency: params.currency,
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: normalizeMsisdn(params.phoneNumber),
        provider: params.provider,
      },
    },
  };
  if (params.callbackUrl) body.callbackUrl = params.callbackUrl;
  if (params.metadata) {
    body.metadata = Object.entries(params.metadata).map(([k, v]) => ({
      [k]: String(v),
    }));
  }
  return pawapayFetch("/v2/payouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// -----------------------------------------------------------------------------
// Vérification de statut (polling de secours si le webhook n'est pas reçu)
// -----------------------------------------------------------------------------
export async function checkDeposit(depositId: string) {
  return pawapayFetch(`/v2/deposits/${depositId}`, { method: "GET" });
}

export async function checkPayout(payoutId: string) {
  return pawapayFetch(`/v2/payouts/${payoutId}`, { method: "GET" });
}

export async function checkRefund(refundId: string) {
  return pawapayFetch(`/v2/refunds/${refundId}`, { method: "GET" });
}

// -----------------------------------------------------------------------------
// Configuration active du compte (providers / devises disponibles)
// -----------------------------------------------------------------------------
export async function getActiveConfiguration(
  country?: string,
  operationType?: "DEPOSIT" | "PAYOUT"
) {
  const qs = new URLSearchParams();
  if (country) qs.set("country", country);
  if (operationType) qs.set("operationType", operationType);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return pawapayFetch(`/v2/active-conf${suffix}`, { method: "GET" });
}

/**
 * Extrait le statut « autoritaire » d'une réponse de lookup (GET /v2/deposits/{id}
 * ou GET /v2/payouts/{id}). L'API v2 renvoie typiquement :
 *   { "status": "FOUND", "data": { "status": "COMPLETED", ... } }
 * On privilégie donc `data.status` puis, à défaut, le `status` racine.
 */
export function extractLookupStatus(resp: any): string {
  const inner = resp?.data ?? resp;
  const nested = Array.isArray(inner) ? inner[0] : inner;
  return (nested?.status || resp?.status || "").toUpperCase();
}

/**
 * Normalise le statut renvoyé par PawaPay vers un statut interne simple.
 * PawaPay renvoie typiquement : ACCEPTED, SUBMITTED, ENQUEUED, COMPLETED,
 * FAILED, REJECTED, DUPLICATE_IGNORED, etc.
 */
export function mapPawaPayStatus(
  status: string
): "SUCCESS" | "FAILED" | "PENDING" {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "SUCCESSFUL", "SUCCESS"].includes(s)) return "SUCCESS";
  if (["FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(s))
    return "FAILED";
  return "PENDING";
}
