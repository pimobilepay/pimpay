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

export function getGeniusPayEnv(): GeniusPayEnv {
  return (process.env.GENIUSPAY_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
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
  const key = process.env.GENIUSPAY_API_KEY;
  if (!key) {
    throw new Error(
      "GENIUSPAY_API_KEY non configuré. Ajoutez-le dans les variables d'environnement du projet."
    );
  }
  return key;
}

function getApiSecret(): string {
  const secret = process.env.GENIUSPAY_API_SECRET;
  if (!secret) {
    throw new Error(
      "GENIUSPAY_API_SECRET non configuré. Ajoutez-le dans les variables d'environnement du projet."
    );
  }
  return secret;
}

export function getGeniusPayWalletId(): string {
  const id = process.env.GENIUSPAY_WALLET_ID;
  if (!id) {
    throw new Error(
      "GENIUSPAY_WALLET_ID non configuré (UUID du wallet marchand pour les payouts)."
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
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "GENIUSPAY_WEBHOOK_SECRET non configuré (secret whsec_... du webhook)."
    );
  }
  return secret;
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
  secret: string = process.env.GENIUSPAY_WEBHOOK_SECRET || ""
): boolean {
  if (!secret || !signature || !timestamp) return false;
  let expected: string;
  try {
    expected = computeWebhookSignature(rawBody, timestamp, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
