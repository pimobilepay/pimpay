// lib/geniuspay.ts
// -----------------------------------------------------------------------------
// Client d'intégration GeniusPay (Merchant API v1)
//
// GeniusPay est un agrégateur ivoirien (XOF / FCFA) supportant :
//   - PAIEMENTS (dépôt / cash-in)   : POST /payments
//       • Sans `payment_method`  -> page de paiement hébergée (checkout_url, carte)
//       • Avec `payment_method`   -> push Mobile Money (wave / orange_money / mtn / moov)
//   - PAYOUTS (retrait / cashout)   : POST /payouts   (depuis un wallet marchand)
//   - WALLETS                        : GET  /wallets
//
// Authentification : deux headers
//   X-API-Key    : clé publique  (pk_sandbox_... / pk_live_...)
//   X-API-Secret : clé secrète   (sk_sandbox_... / sk_live_...) — SERVEUR UNIQUEMENT
//
// Webhooks : endpoint unique (cf. dashboard GeniusPay), signature HMAC-SHA256 :
//   signature = HMAC_SHA256(secret, `${timestamp}.${rawBody}`)
//   headers   : X-Webhook-Signature, X-Webhook-Timestamp, X-Webhook-Event,
//               X-Webhook-Environment (sandbox | live)
//
// Variables d'environnement attendues :
//   GENIUSPAY_API_KEY        - clé publique  (pk_sandbox_... / pk_live_...)
//   GENIUSPAY_API_SECRET     - clé secrète   (sk_sandbox_... / sk_live_...)
//   GENIUSPAY_WEBHOOK_SECRET - secret webhook (whsec_...)
//   GENIUSPAY_ENV            - "sandbox" (défaut) ou "production"
//   GENIUSPAY_WALLET_ID      - UUID du wallet marchand utilisé pour les payouts
//   NEXT_PUBLIC_APP_URL      - URL publique de l'app (callback / redirection)
// -----------------------------------------------------------------------------

import crypto from "crypto";
import {
  GENIUSPAY_MOMO_METHODS,
  resolveMomoMethod,
  resolveApiCurrency,
  isGeniusPayCurrencySupported,
  type GeniusPayMomoMethod,
} from "./geniuspay-catalog";

// Ré-export depuis le catalogue partagé (source de vérité unique, safe client).
export { GENIUSPAY_MOMO_METHODS, resolveMomoMethod, resolveApiCurrency, isGeniusPayCurrencySupported };
export type { GeniusPayMomoMethod };

// -----------------------------------------------------------------------------
// Normalisation de la devise envoyée à l'API GeniusPay
// -----------------------------------------------------------------------------
// [Déplacé vers lib/geniuspay-catalog.ts] `resolveApiCurrency` /
// `isGeniusPayCurrencySupported` vivent maintenant dans le catalogue partagé
// (safe client) car `lib/aggregator.ts` en a besoin pour décider, dès la
// sélection de l'agrégateur, si GeniusPay peut réellement traiter la devise
// du pays — sinon on bascule vers PawaPay. Voir le commentaire détaillé dans
// geniuspay-catalog.ts pour l'historique complet (erreur 422 "validation.in").

export type GeniusPayEnv = "sandbox" | "production";

export function normalizeGeniusPayEnv(value?: string | null): GeniusPayEnv {
  const v = (value || "").toLowerCase().trim();
  return v === "production" || v === "live" || v === "mainnet"
    ? "production"
    : "sandbox";
}

/**
 * Environnement GeniusPay ACTIF.
 *
 * Source de vérité : `process.env.GENIUSPAY_ENV`.
 * La bascule Admin (Réglages > Mobile Money GeniusPay) persiste la valeur en
 * base (SystemConfig.geniuspayEnv) ET réécrit `process.env.GENIUSPAY_ENV` en
 * mémoire, puis `hydrateGeniusPayEnv()` réaligne les workers serverless froids.
 * Aucun redéploiement n'est nécessaire.
 */
export function getGeniusPayEnv(): GeniusPayEnv {
  return normalizeGeniusPayEnv(process.env.GENIUSPAY_ENV);
}

export function isGeniusPayLive(): boolean {
  return getGeniusPayEnv() === "production";
}

// -----------------------------------------------------------------------------
// Résolution des identifiants selon l'environnement actif
// -----------------------------------------------------------------------------
// Chaque secret peut être défini de deux façons :
//   1. Par environnement  : GENIUSPAY_API_KEY_LIVE / GENIUSPAY_API_KEY_SANDBOX
//   2. Générique (legacy) : GENIUSPAY_API_KEY
// On privilégie TOUJOURS la variante suffixée correspondant à l'environnement
// actif, avec repli sur la variable générique. Cela permet de garder les clés
// sandbox ET live configurées en permanence et de basculer instantanément.
function resolveEnvVar(base: string): string | undefined {
  const suffix = getGeniusPayEnv() === "production" ? "LIVE" : "SANDBOX";
  const scoped = process.env[`${base}_${suffix}`];
  if (scoped && scoped.trim()) return scoped.trim();
  const generic = process.env[base];
  return generic && generic.trim() ? generic.trim() : undefined;
}

/** Indique si la clé attendue pour l'environnement actif est bien configurée. */
export function getGeniusPayCredentialStatus() {
  const env = getGeniusPayEnv();
  const apiKey = resolveEnvVar("GENIUSPAY_API_KEY");
  const apiSecret = resolveEnvVar("GENIUSPAY_API_SECRET");
  const webhookSecret = resolveEnvVar("GENIUSPAY_WEBHOOK_SECRET");
  const walletId = resolveEnvVar("GENIUSPAY_WALLET_ID");

  // Cohérence : une clé pk_live_ ne doit pas être utilisée en sandbox (et inversement).
  const keyPrefix = apiKey ? apiKey.slice(0, 11) : null;
  const looksLive = /^pk_live_/i.test(apiKey || "");
  const looksSandbox = /^pk_sandbox_/i.test(apiKey || "");
  const mismatch =
    (env === "production" && looksSandbox) ||
    (env === "sandbox" && looksLive);

  return {
    env,
    apiKey: Boolean(apiKey),
    apiSecret: Boolean(apiSecret),
    webhookSecret: Boolean(webhookSecret),
    walletId: Boolean(walletId),
    keyPrefix,
    mismatch,
    ready: Boolean(apiKey && apiSecret),
  };
}

/**
 * URL de base de l'API GeniusPay.
 * L'intégration est identique en Sandbox et Live — seules les clés changent
 * (pk_sandbox_/sk_sandbox_ vs pk_live_/sk_live_). L'API vit sur le même hôte.
 */
export function getGeniusPayBaseUrl(): string {
  // IMPORTANT : l'API COURANTE de GeniusPay vit sur `geniuspay.ci`.
  // L'ancien hôte `pay.genius.ci` est LEGACY et protégé par Imunify360
  // (bot-protection) qui bloque les IP serverless Vercel + renvoie des 400.
  // On force donc `geniuspay.ci` par défaut. Si GENIUSPAY_BASE_URL pointe
  // encore vers l'ancien hôte, on le réécrit automatiquement.
  const raw = (
    process.env.GENIUSPAY_BASE_URL || "https://geniuspay.ci/api/v1/merchant"
  ).replace(/\/$/, "");
  return raw.replace(
    /^https?:\/\/pay\.genius\.ci/i,
    "https://geniuspay.ci"
  );
}

/**
 * Hôtes candidats pour l'API PAYOUT (retraits / cashout).
 *
 * L'API Payout n'est PAS servie par le même hôte que l'API Payments :
 *   - `https://geniuspay.ci/docs/payout-api` affiche « Payouts API — Bientôt
 *     disponible » : sur cet hôte, POST /payouts renvoie 404/405.
 *   - La documentation Payout OPÉRATIONNELLE vit sur l'hôte historique
 *     `https://pay.genius.ci/docs/payout-api` (POST /api/v1/merchant/payouts).
 *
 * On essaie donc les hôtes dans l'ordre et on bascule automatiquement sur le
 * suivant quand l'endpoint est absent (404 / 405) ou bloqué (Imunify360).
 * `GENIUSPAY_PAYOUT_BASE_URL` permet de forcer un hôte unique en production.
 */
export function getGeniusPayPayoutBaseUrls(): string[] {
  const forced = (process.env.GENIUSPAY_PAYOUT_BASE_URL || "").replace(
    /\/$/,
    ""
  );
  const candidates = [
    forced,
    getGeniusPayBaseUrl(),
    "https://pay.genius.ci/api/v1/merchant",
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

function getApiKey(): string {
  const key = resolveEnvVar("GENIUSPAY_API_KEY");
  if (!key) {
    throw new Error(
      `GENIUSPAY_API_KEY non configuré pour l'environnement "${getGeniusPayEnv()}". ` +
        `Ajoutez GENIUSPAY_API_KEY_${getGeniusPayEnv() === "production" ? "LIVE" : "SANDBOX"} ` +
        `(ou GENIUSPAY_API_KEY) dans les variables d'environnement du projet.`
    );
  }
  return key;
}

function getApiSecret(): string {
  const secret = resolveEnvVar("GENIUSPAY_API_SECRET");
  if (!secret) {
    throw new Error(
      `GENIUSPAY_API_SECRET non configuré pour l'environnement "${getGeniusPayEnv()}". ` +
        `Ajoutez GENIUSPAY_API_SECRET_${getGeniusPayEnv() === "production" ? "LIVE" : "SANDBOX"} ` +
        `(ou GENIUSPAY_API_SECRET) dans les variables d'environnement du projet.`
    );
  }
  return secret;
}

export function getGeniusPayWalletId(): string {
  const id = resolveEnvVar("GENIUSPAY_WALLET_ID");
  if (!id) {
    throw new Error(
      `GENIUSPAY_WALLET_ID non configuré pour l'environnement "${getGeniusPayEnv()}" ` +
        `(UUID du wallet marchand pour les payouts).`
    );
  }
  return id;
}

/** URL de base publique de l'app (redirection checkout / construction de liens). */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://pimobipay.vercel.app"
  ).replace(/\/$/, "");
}

// -----------------------------------------------------------------------------
// Appel HTTP générique vers l'API GeniusPay
// -----------------------------------------------------------------------------
export interface GeniusPayResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export interface GeniusPayFetchOptions extends RequestInit {
  /** Hôte alternatif (ex: API Payout servie par pay.genius.ci). */
  baseUrl?: string;
}

export async function geniusPayFetch<T = any>(
  path: string,
  init?: GeniusPayFetchOptions
): Promise<GeniusPayResponse<T>> {
  // Aligne l'environnement actif (sandbox / production) sur le choix admin
  // persisté en base. Import dynamique : `lib/geniuspay.ts` reste sans
  // dépendance à Prisma au chargement du module.
  try {
    const { hydrateGeniusPayEnv } = await import("./geniuspay-env");
    await hydrateGeniusPayEnv();
  } catch {
    // Base indisponible -> on retombe sur process.env.GENIUSPAY_ENV.
  }

  const { baseUrl, ...rest } = init || {};
  const url = `${baseUrl || getGeniusPayBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "X-API-Key": getApiKey(),
      "X-API-Secret": getApiSecret(),
      // L'API Payout exige `Authorization: Bearer <MERCHANT_API_KEY>` alors que
      // l'API Payments utilise X-API-Key/X-API-Secret. On envoie les deux :
      // l'API Payments ignore simplement l'en-tête Bearer supplémentaire.
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      // ---------------------------------------------------------------------
      // Contournement Imunify360 (bot-protection) côté pay.genius.ci.
      // Les fonctions serverless Vercel utilisent un User-Agent "node" par
      // défaut, systématiquement bloqué par Imunify360 ("Access denied by
      // Imunify360 bot-protection"). On envoie des en-têtes de navigateur
      // réalistes pour être traité comme un client légitime.
      // NB : la solution définitive reste le whitelisting des IP de sortie
      // Vercel dans le tableau de bord Imunify360 de GeniusPay.
      "User-Agent":
        process.env.GENIUSPAY_USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Origin: getAppBaseUrl(),
      Referer: `${getAppBaseUrl()}/`,
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

  // Détection explicite d'un blocage Imunify360 (réponse HTML, pas JSON).
  // On renvoie un message clair au lieu d'un "refus agrégateur" générique.
  if (
    typeof data === "string" &&
    /imunify360|bot-protection|access denied/i.test(data)
  ) {
    return {
      ok: false,
      status: res.status || 403,
      data: {
        error:
          "Le service de paiement GeniusPay a bloqué la requête (protection anti-bot Imunify360). Les IP de sortie Vercel doivent être ajoutées à la liste blanche côté GeniusPay.",
        blocked: "IMUNIFY360",
      } as any,
    };
  }

  return { ok: res.ok, status: res.status, data };
}

// -----------------------------------------------------------------------------
// Diagnostic des réponses d'erreur GeniusPay
// -----------------------------------------------------------------------------
/**
 * Extrait un message lisible d'une réponse GeniusPay, quelle que soit la forme :
 *   { error: { code, message } } | { error: "..." } | { message } |
 *   { message, errors: { champ: [...] } }
 */
export function extractGeniusPayMessage(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  const errObj = data.error;
  const base =
    (typeof errObj === "object" ? errObj?.message : errObj) || data.message;
  const errorsObj =
    data.errors || (typeof errObj === "object" ? errObj?.errors : undefined);
  let fields = "";
  if (errorsObj && typeof errorsObj === "object") {
    fields = Object.entries(errorsObj)
      .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(", ") : m}`)
      .join(" | ");
  }
  if (!base && !fields) return null;
  return fields ? `${base || "Requête refusée"} (${fields})` : String(base);
}

/**
 * Quota Sandbox épuisé côté GeniusPay :
 *   { error: { code: "PAYMENT_INIT_FAILED",
 *              message: "Sandbox access denied: No tokens remaining (0)" } }
 *
 * Ce n'est PAS une erreur d'intégration : le compte marchand n'a plus de jetons
 * de test. Aucun paiement ni payout ne peut aboutir tant que les jetons ne sont
 * pas rechargés OU que l'on ne passe pas en LIVE (clés pk_live_/sk_live_ +
 * GENIUSPAY_ENV=production). On doit donc basculer sur l'agrégateur de secours.
 */
export function isGeniusPaySandboxQuotaError(data: any): boolean {
  const msg = `${extractGeniusPayMessage(data) || ""} ${
    typeof data === "string" ? data : JSON.stringify(data ?? "")
  }`;
  return /no tokens remaining|sandbox access denied|quota (exceeded|epuise)/i.test(
    msg
  );
}

/**
 * GeniusPay (ou sa passerelle PawaPay) n'a pas pu déduire l'opérateur Mobile
 * Money à partir du numéro fourni :
 *   "Unable to predict provider for phone number: 22898554742.
 *    Please provide a provider code."
 *
 * C'est le cas des pays hors couverture MMO de la passerelle (ex. Togo +228 :
 * aucun `provider code` n'existe, il est donc impossible d'en fournir un).
 * Ce n'est PAS un refus de paiement : le dépôt doit être rejoué SANS
 * `payment_method` afin d'obtenir la page de paiement hébergée GeniusPay, où le
 * client choisit lui-même son moyen de paiement.
 */
export function isGeniusPayProviderPredictionError(data: any): boolean {
  const msg = `${extractGeniusPayMessage(data) || ""} ${
    typeof data === "string" ? data : JSON.stringify(data ?? "")
  }`;
  return /unable to predict (the )?provider|provide a provider code|provider_?code is required|unknown provider for (the )?(phone|msisdn)/i.test(
    msg
  );
}

/** Message explicite (FR) à afficher / journaliser pour un quota sandbox épuisé. */
export const GENIUSPAY_SANDBOX_QUOTA_MESSAGE =
  "Le compte GeniusPay Sandbox n'a plus de jetons de test (No tokens remaining). " +
  "Rechargez les jetons dans le tableau de bord GeniusPay ou passez en production " +
  "(clés pk_live_/sk_live_ + GENIUSPAY_ENV=production).";

/**
 * true quand GeniusPay est INDISPONIBLE (et non pas quand il refuse
 * légitimement l'opération) : quota sandbox épuisé, blocage anti-bot
 * Imunify360, endpoint absent (404/405/501) ou panne serveur (5xx).
 *
 * Dans ces cas, l'opération doit être ré-essayée chez PawaPay (agrégateur de
 * secours) au lieu d'échouer : c'est la cause des dépôts/retraits qui
 * échouaient systématiquement avec « Sandbox access denied ».
 */
export function isGeniusPayUnavailable(resp: {
  status: number;
  data: any;
}): boolean {
  if (!resp) return true;
  if ((resp.data as any)?.blocked === "IMUNIFY360") return true;
  if ([404, 405, 501, 502, 503, 504].includes(resp.status)) return true;
  if (resp.status >= 500) return true;
  return isGeniusPaySandboxQuotaError(resp.data);
}

// -----------------------------------------------------------------------------
// Normalisation du numéro de téléphone
// GeniusPay recommande le format international (+225...). On garde le "+" et les
// chiffres uniquement.
// -----------------------------------------------------------------------------
export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits.replace(/^0+/, "")}`;
}

// -----------------------------------------------------------------------------
// PAIEMENT (dépôt / cash-in) : POST /payments
// -----------------------------------------------------------------------------
export interface GeniusPayCustomer {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
}

export interface CreatePaymentParams {
  /** Montant dans la devise indiquée (entier). Min 200 XOF. */
  amount: number;
  /** Devise : XOF, XAF, CDF, USD, KES, RWF, SLE, UGX, ZMW. Défaut XOF. */
  currency?: string;
  /**
   * Moyen de paiement (wave / orange_money / mtn_money / moov_money /
   * airtel_money / pawapay / card). Si omis, GeniusPay renvoie une
   * `checkout_url` (page hébergée : le client choisit son moyen de paiement).
   */
  paymentMethod?: GeniusPayMomoMethod | "pawapay" | "card";
  /** Code fournisseur MMO PawaPay explicite (ex: AIRTEL_COG, MTN_MOMO_COG). */
  mmoProvider?: string;
  description?: string;
  customer?: GeniusPayCustomer;
  /** URL de redirection après succès (page checkout hébergée). */
  successUrl?: string;
  /** URL de redirection après échec (page checkout hébergée). */
  errorUrl?: string;
  /** Données personnalisées retournées telles quelles dans les webhooks. */
  metadata?: Record<string, any>;
}

export interface GeniusPayPayment {
  id?: number;
  reference: string;
  amount: number;
  fees?: number;
  net_amount?: number;
  currency?: string;
  status: string;
  /** Page de checkout hébergée (moyen de paiement non spécifié). */
  checkout_url?: string;
  /** Lien de paiement direct (ex: lien Wave) quand payment_method est fourni. */
  payment_url?: string;
  gateway?: string;
  payment_method?: string | null;
  customer?: GeniusPayCustomer;
  metadata?: Record<string, any>;
  expires_at?: string;
  created_at?: string;
  completed_at?: string | null;
}

export async function createPayment(params: CreatePaymentParams) {
  const body: Record<string, any> = {
    amount: Math.round(params.amount),
    currency: resolveApiCurrency(params.currency),
  };
  if (params.paymentMethod) body.payment_method = params.paymentMethod;
  if (params.mmoProvider) body.mmo_provider = params.mmoProvider;
  if (params.description) body.description = params.description.slice(0, 500);
  if (params.customer) {
    const c: GeniusPayCustomer = {};
    if (params.customer.name) c.name = params.customer.name;
    if (params.customer.email) c.email = params.customer.email;
    if (params.customer.phone) c.phone = normalizePhone(params.customer.phone);
    if (params.customer.country) c.country = params.customer.country;
    body.customer = c;
  }
  if (params.successUrl) body.success_url = params.successUrl;
  if (params.errorUrl) body.error_url = params.errorUrl;
  if (params.metadata) body.metadata = params.metadata;

  console.log("[v0] GENIUSPAY_CREATE_PAYMENT_BODY:", JSON.stringify(body));
  return geniusPayFetch<{ data: GeniusPayPayment } | GeniusPayPayment>(
    "/payments",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function checkPayment(reference: string) {
  return geniusPayFetch<{ data: GeniusPayPayment } | GeniusPayPayment>(
    `/payments/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );
}

// -----------------------------------------------------------------------------
// PAYOUT (retrait / cashout vers Mobile Money) : POST /payouts
// -----------------------------------------------------------------------------
/** Montant minimum accepté par GeniusPay (identique aux paiements : 200 XOF). */
export const GENIUSPAY_MIN_AMOUNT = 200;

export interface CreatePayoutParams {
  /** UUID du wallet marchand débité (défaut : GENIUSPAY_WALLET_ID). */
  walletId?: string;
  /** Montant en devise locale (entier). */
  amount: number;
  currency?: string;
  recipient: {
    name?: string;
    phone: string;
    email?: string;
  };
  /**
   * Destination du payout. REQUISE par l'API : sans elle, GeniusPay renvoie un
   * 422 VALIDATION_ERROR et le retrait échoue.
   */
  destination?: {
    type?: "mobile_money" | "bank";
    /** wave | orange_money | mtn_money | moov_money | airtel_money */
    provider?: string;
    /** Numéro Mobile Money ou IBAN. Défaut : téléphone du bénéficiaire. */
    account?: string;
  };
  description?: string;
  metadata?: Record<string, any>;
  /** Clé d'idempotence (évite tout double payout en cas de retry réseau). */
  idempotencyKey?: string;
}

export interface GeniusPayPayout {
  id?: string;
  reference: string;
  status: string;
  amount: number;
  fees?: number;
  net_amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

/**
 * Enveloppe le corps `/payouts` conformément à la doc Payout API :
 * { wallet_id, recipient{}, destination{type,provider,account}, amount,
 *   currency, description, metadata, idempotency_key }
 */
function buildPayoutBody(params: CreatePayoutParams): Record<string, any> {
  const phone = normalizePhone(params.recipient.phone);
  const account = normalizePhone(params.destination?.account || phone) || phone;
  // `provider` peut arriver sous forme de libellé libre ("Orange Money CI",
  // "wave_ci"...) : on le normalise vers un code GeniusPay valide.
  const rawProvider = (params.destination?.provider || "").trim();
  const provider = GENIUSPAY_MOMO_METHODS.includes(
    rawProvider.toLowerCase() as GeniusPayMomoMethod
  )
    ? rawProvider.toLowerCase()
    : resolveMomoMethod(rawProvider) || "wave";

  const body: Record<string, any> = {
    wallet_id: params.walletId || getGeniusPayWalletId(),
    amount: Math.round(params.amount),
    currency: resolveApiCurrency(params.currency),
    recipient: {
      phone,
      // GeniusPay attend un nom de bénéficiaire : on retombe sur le numéro
      // plutôt que d'omettre le champ (source de 422 en production).
      name: params.recipient.name || phone,
      ...(params.recipient.email ? { email: params.recipient.email } : {}),
    },
    destination: {
      type: params.destination?.type || "mobile_money",
      provider,
      account,
    },
    idempotency_key:
      params.idempotencyKey ||
      `${account}-${Math.round(params.amount)}-${Date.now()}`,
  };
  if (params.description) body.description = params.description.slice(0, 500);
  if (params.metadata) body.metadata = params.metadata;
  return body;
}

/**
 * Appel Payout avec bascule automatique d'hôte : l'API Payout n'est pas encore
 * exposée sur geniuspay.ci (404/405) alors qu'elle l'est sur pay.genius.ci.
 * On essaie les hôtes dans l'ordre jusqu'à obtenir une réponse exploitable.
 */
async function payoutFetch<T = any>(
  path: string,
  init: GeniusPayFetchOptions
): Promise<GeniusPayResponse<T>> {
  const hosts = getGeniusPayPayoutBaseUrls();
  let last: GeniusPayResponse<T> | null = null;

  for (const baseUrl of hosts) {
    const res = await geniusPayFetch<T>(path, { ...init, baseUrl });
    last = res;
    const endpointMissing =
      res.status === 404 || res.status === 405 || res.status === 501;
    const blocked = (res.data as any)?.blocked === "IMUNIFY360";
    if (!endpointMissing && !blocked) return res;
    console.warn(
      `[v0] GENIUSPAY_PAYOUT: hôte ${baseUrl} indisponible (status ${res.status}), bascule sur l'hôte suivant.`
    );
  }
  return last as GeniusPayResponse<T>;
}

export async function createPayout(params: CreatePayoutParams) {
  const body = buildPayoutBody(params);
  console.log(
    "[v0] GENIUSPAY_CREATE_PAYOUT_BODY:",
    JSON.stringify({ ...body, wallet_id: "***" })
  );
  return payoutFetch<any>("/payouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function checkPayout(reference: string) {
  return payoutFetch<any>(`/payouts/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}

export async function listWallets() {
  return payoutFetch<{ wallets: any[] } | any[]>("/wallets", {
    method: "GET",
  });
}

// -----------------------------------------------------------------------------
// Helpers de réponse / statut
// -----------------------------------------------------------------------------

/** Déballe la charge utile GeniusPay, qui est parfois enveloppée dans `data`. */
export function unwrap<T = any>(resp: any): T {
  if (resp && typeof resp === "object" && "data" in resp && resp.data != null) {
    return resp.data as T;
  }
  return resp as T;
}

/**
 * Déballe un payout, dont la charge utile est DOUBLEMENT enveloppée :
 * `{ success, data: { payout: { reference, status, ... } } }`.
 *
 * `unwrap()` seul ne retire qu'un niveau et renvoyait `{ payout: {...} }` :
 * `reference` était donc toujours `undefined`, le payout était considéré comme
 * refusé et le retrait passait en FAILED même quand GeniusPay l'avait accepté.
 */
export function unwrapPayout(resp: any): GeniusPayPayout | null {
  const first = unwrap<any>(resp);
  if (!first || typeof first !== "object") return null;
  if (first.payout && typeof first.payout === "object") {
    return first.payout as GeniusPayPayout;
  }
  return first as GeniusPayPayout;
}

/**
 * Normalise un statut GeniusPay vers un statut interne simple.
 * GeniusPay : pending, processing, completed, failed, expired, cancelled, refunded,
 *             requested, approved.
 */
export function mapGeniusPayStatus(
  status: string
): "SUCCESS" | "FAILED" | "PENDING" {
  const s = (status || "").toLowerCase();
  if (["completed", "success", "successful", "paid", "approved"].includes(s))
    return "SUCCESS";
  if (["failed", "expired", "cancelled", "canceled", "rejected"].includes(s))
    return "FAILED";
  return "PENDING";
}

// -----------------------------------------------------------------------------
// WEBHOOKS : vérification de la signature HMAC-SHA256
// signature = HMAC_SHA256(secret, `${timestamp}.${rawBody}`)  (hex)
// -----------------------------------------------------------------------------
export function getWebhookSecret(): string {
  const secret = resolveEnvVar("GENIUSPAY_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error(
      `GENIUSPAY_WEBHOOK_SECRET non configuré pour l'environnement "${getGeniusPayEnv()}" ` +
        `(secret whsec_... du webhook).`
    );
  }
  return secret;
}

/** URL publique à déclarer côté dashboard GeniusPay (endpoint unique). */
export function getGeniusPayWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/transaction/webhook`;
}

/**
 * Tous les secrets webhook configurés (sandbox + live + legacy).
 *
 * GeniusPay signe avec le secret du webhook qui a émis l'événement. Comme un
 * même endpoint peut recevoir des événements Sandbox ET Production pendant une
 * bascule, on accepte n'importe quel secret configuré : la vérification HMAC
 * reste stricte (aucun payload non signé n'est accepté).
 */
export function getWebhookSecretCandidates(): string[] {
  const scoped =
    getGeniusPayEnv() === "production"
      ? process.env.GENIUSPAY_WEBHOOK_SECRET_LIVE
      : process.env.GENIUSPAY_WEBHOOK_SECRET_SANDBOX;
  const candidates = [
    scoped,
    process.env.GENIUSPAY_WEBHOOK_SECRET_LIVE,
    process.env.GENIUSPAY_WEBHOOK_SECRET_SANDBOX,
    process.env.GENIUSPAY_WEBHOOK_SECRET,
  ]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return Array.from(new Set(candidates));
}

export function computeWebhookSignature(
  rawBody: string,
  timestamp: string,
  secret: string = getWebhookSecret()
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

/**
 * Vérifie la signature d'un webhook GeniusPay en temps constant.
 * @param rawBody   corps brut EXACT reçu (avant tout JSON.parse)
 * @param signature valeur du header X-Webhook-Signature
 * @param timestamp valeur du header X-Webhook-Timestamp
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret?: string
): boolean {
  if (!signature || !timestamp) return false;

  const secrets = secret ? [secret] : getWebhookSecretCandidates();
  if (secrets.length === 0) return false; // fail-closed

  const provided = Buffer.from(signature.trim(), "utf8");
  return secrets.some((s) => {
    let expected: string;
    try {
      expected = computeWebhookSignature(rawBody, timestamp, s);
    } catch {
      return false;
    }
    const a = Buffer.from(expected, "utf8");
    if (a.length !== provided.length) return false;
    return crypto.timingSafeEqual(a, provided);
  });
}
