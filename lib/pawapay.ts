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
// Catalogue des pays / providers PawaPay.
// La source de vérité est `lib/pawapay-catalog.ts` (safe client + serveur), afin
// que le frontend (filtrage des opérateurs) et le backend (résolution du provider)
// partagent EXACTEMENT la même liste. On ré-exporte ici pour compatibilité.
// -----------------------------------------------------------------------------
export {
  PAWAPAY_COUNTRIES,
  PROVIDER_RULES,
  resolveProvider,
  isCountrySupported,
  getSupportedProviders,
  isOperatorSupported,
  filterSupportedOperators,
} from "./pawapay-catalog";
export type {
  PawaPayCountry,
  ProviderRule,
  ResolvedProvider,
} from "./pawapay-catalog";

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
  // NOTE : L'API PawaPay Merchant v2 n'accepte PAS `callbackUrl` dans le corps
  // de la requête (paramètre non supporté -> 400). Les URLs de callback/webhook
  // se configurent depuis le dashboard PawaPay. On conserve le champ dans les
  // params pour compatibilité, mais on ne l'envoie jamais dans le body.
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
  // NOTE : L'API PawaPay Merchant v2 n'accepte PAS `callbackUrl` dans le corps
  // de la requête (paramètre non supporté -> 400). Les URLs de callback/webhook
  // se configurent depuis le dashboard PawaPay.
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
// PAGE DE PAIEMENT HÉBERGÉE (checkout) : POST /v1/widget/sessions
// -----------------------------------------------------------------------------
// Contrairement à /v2/deposits (push MoMo direct, sans redirection), cette
// API crée une session sur la Payment Page hébergée par PawaPay et renvoie
// une `redirectUrl` : le client doit être redirigé vers cette page pour
// choisir son opérateur / saisir son numéro et confirmer le paiement — un
// parcours "checkout" équivalent à celui de GeniusPay (checkout_url).
//
// Une fois le paiement terminé, PawaPay renvoie le client vers `returnUrl`
// (avec `depositId` en paramètre de requête). Le dépôt correspondant est
// ensuite vérifiable via GET /v2/deposits/{depositId} (checkDeposit) ou reçu
// par webhook, EXACTEMENT comme pour un dépôt direct — même `depositId`,
// même logique de crédit, aucune duplication de flux de confirmation.
// -----------------------------------------------------------------------------
export interface PawaPayMetadataField {
  fieldName: string;
  fieldValue: string;
  isPII?: boolean;
}

export interface CreatePaymentPageSessionParams {
  depositId: string;
  amount: string; // montant en devise locale, string (ex: "1500")
  returnUrl: string;
  msisdn?: string; // pré-remplit le numéro (le client ne peut plus le changer si fourni)
  country?: string; // ISO 3166-1 alpha-3 (ex: "ZMB") — restreint le pays sur la page
  language?: "EN" | "FR";
  reason?: string; // affiché au client (1-50 caractères)
  statementDescription?: string; // 4-22 caractères alphanumériques + espaces
  metadata?: PawaPayMetadataField[];
}

export async function createPaymentPageSession(
  params: CreatePaymentPageSessionParams
) {
  const body: any = {
    depositId: params.depositId,
    returnUrl: params.returnUrl,
    amount: params.amount,
  };
  if (params.msisdn) body.msisdn = normalizeMsisdn(params.msisdn);
  if (params.country) body.country = params.country;
  if (params.language) body.language = params.language;
  if (params.reason) body.reason = params.reason;
  if (params.statementDescription)
    body.statementDescription = params.statementDescription;
  if (params.metadata && params.metadata.length) body.metadata = params.metadata;

  return pawapayFetch<{ redirectUrl?: string }>("/v1/widget/sessions", {
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
