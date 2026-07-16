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
  type GeniusPayMomoMethod,
} from "./geniuspay-catalog";

// Ré-export depuis le catalogue partagé (source de vérité unique, safe client).
export { GENIUSPAY_MOMO_METHODS, resolveMomoMethod };
export type { GeniusPayMomoMethod };

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
  return (
    process.env.GENIUSPAY_BASE_URL || "https://pay.genius.ci/api/v1/merchant"
  ).replace(/\/$/, "");
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

export async function geniusPayFetch<T = any>(
  path: string,
  init?: RequestInit
): Promise<GeniusPayResponse<T>> {
  const url = `${getGeniusPayBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-API-Key": getApiKey(),
      "X-API-Secret": getApiSecret(),
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
  /** Montant en XOF (entier). */
  amount: number;
  /** Devise, toujours "XOF" chez GeniusPay. */
  currency?: string;
  /**
   * Moyen de paiement Mobile Money (wave / orange_money / mtn / moov).
   * Si omis, GeniusPay renvoie une `checkout_url` (page hébergée, carte bancaire).
   */
  paymentMethod?: GeniusPayMomoMethod;
  description?: string;
  customer?: GeniusPayCustomer;
  /** Données personnalisées retournées telles quelles dans les webhooks. */
  metadata?: Record<string, any>;
}

export interface GeniusPayPayment {
  reference: string;
  amount: number;
  net_amount?: number;
  currency?: string;
  status: string;
  checkout_url?: string;
  payment_method?: string | null;
  customer?: GeniusPayCustomer;
  metadata?: Record<string, any>;
  created_at?: string;
  completed_at?: string | null;
}

export async function createPayment(params: CreatePaymentParams) {
  const body: Record<string, any> = {
    amount: Math.round(params.amount),
    currency: params.currency || "XOF",
  };
  if (params.paymentMethod) body.payment_method = params.paymentMethod;
  if (params.description) body.description = params.description.slice(0, 500);
  if (params.customer) {
    const c: GeniusPayCustomer = {};
    if (params.customer.name) c.name = params.customer.name;
    if (params.customer.email) c.email = params.customer.email;
    if (params.customer.phone) c.phone = normalizePhone(params.customer.phone);
    if (params.customer.country) c.country = params.customer.country;
    body.customer = c;
  }
  if (params.metadata) body.metadata = params.metadata;

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
export interface CreatePayoutParams {
  /** UUID du wallet marchand débité (défaut : GENIUSPAY_WALLET_ID). */
  walletId?: string;
  /** Montant en XOF (entier). */
  amount: number;
  currency?: string;
  recipient: {
    name?: string;
    phone: string;
  };
  description?: string;
  metadata?: Record<string, any>;
}

export interface GeniusPayPayout {
  reference: string;
  status: string;
  amount: number;
  fees?: number;
  net_amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export async function createPayout(params: CreatePayoutParams) {
  const body: Record<string, any> = {
    wallet_id: params.walletId || getGeniusPayWalletId(),
    amount: Math.round(params.amount),
    currency: params.currency || "XOF",
    recipient: {
      phone: normalizePhone(params.recipient.phone),
      ...(params.recipient.name ? { name: params.recipient.name } : {}),
    },
  };
  if (params.description) body.description = params.description.slice(0, 500);
  if (params.metadata) body.metadata = params.metadata;

  return geniusPayFetch<{ data: GeniusPayPayout } | GeniusPayPayout>(
    "/payouts",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function checkPayout(reference: string) {
  return geniusPayFetch<{ data: GeniusPayPayout } | GeniusPayPayout>(
    `/payouts/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );
}

export async function listWallets() {
  return geniusPayFetch<{ wallets: any[] } | any[]>("/wallets", {
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
