/** Shared server-side Pi Network configuration and API helpers. */

import { prisma } from "@/lib/prisma";

const PI_API_BASE = "https://api.minepi.com/v2";
const CONFIG_KEY = "GLOBAL_CONFIG";

export type PiNetwork = "testnet" | "mainnet";

function getEnvironmentPiNetwork(): PiNetwork | null {
  const horizonUrl = process.env.PI_HORIZON_URL;
  const passphrase = process.env.PI_NETWORK_PASSPHRASE;
  if (!horizonUrl || !passphrase) return null;

  try {
    const host = new URL(horizonUrl).hostname;
    if (host === "api.mainnet.minepi.com" && passphrase === "Pi Network") return "mainnet";
    if (host === "api.testnet.minepi.com" && passphrase === "Pi Testnet") return "testnet";
  } catch {
    return null;
  }

  return null;
}

export async function getPiNetwork(): Promise<PiNetwork> {
  let config: { piNetwork: string | null } | null;
  try {
    config = await prisma.systemConfig.findUnique({
      where: { id: CONFIG_KEY },
      select: { piNetwork: true },
    });
  } catch {
    const environmentNetwork = getEnvironmentPiNetwork();
    if (environmentNetwork) return environmentNetwork;
    return process.env.PI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  }

  if (config?.piNetwork === "testnet" || config?.piNetwork === "mainnet") {
    return config.piNetwork;
  }
  if (!config) {
    const environmentNetwork = getEnvironmentPiNetwork();
    if (environmentNetwork) return environmentNetwork;
    return process.env.PI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  }

  throw new Error("Pi Network n'est pas configure dans SystemConfig");
}

export async function getPiNetworkConfig(networkOverride?: PiNetwork) {
  const network = networkOverride ?? await getPiNetwork();
  const expectedPassphrase = network === "mainnet" ? "Pi Network" : "Pi Testnet";
  const configuredPassphrase = process.env.PI_NETWORK_PASSPHRASE;
  const expectedHost = network === "mainnet" ? "api.mainnet.minepi.com" : "api.testnet.minepi.com";
  const horizonUrl = process.env.PI_HORIZON_URL;
  if (configuredPassphrase !== expectedPassphrase) {
    throw new Error("PI_NETWORK_PASSPHRASE ne correspond pas au réseau sélectionné");
  }
  if (!horizonUrl) throw new Error("PI_HORIZON_URL n'est pas configure");

  let parsedHorizonUrl: URL;
  try {
    parsedHorizonUrl = new URL(horizonUrl);
  } catch {
    throw new Error("PI_HORIZON_URL est invalide");
  }
  if (
    parsedHorizonUrl.protocol !== "https:" ||
    parsedHorizonUrl.hostname !== expectedHost ||
    parsedHorizonUrl.pathname !== "/" ||
    parsedHorizonUrl.search ||
    parsedHorizonUrl.hash ||
    parsedHorizonUrl.username ||
    parsedHorizonUrl.password
  ) {
    throw new Error("PI_HORIZON_URL ne correspond pas au réseau Pi sélectionné");
  }

  const apiKey = process.env.PI_API_KEY;
  const masterAddress = process.env.PI_MASTER_WALLET_ADDRESS;
  const masterSecret = process.env.PI_MASTER_WALLET_SECRET;
  if (!apiKey) throw new Error("PI_API_KEY n'est pas configure");
  if (!masterAddress || !masterSecret) {
    throw new Error("Le portefeuille maître Pi n'est pas configuré pour le réseau actif");
  }

  return {
    network,
    sandbox: network === "testnet",
    horizonUrl: parsedHorizonUrl.origin,
    passphrase: expectedPassphrase,
    apiKey,
    masterAddress,
    masterSecret,
  };
}

export async function verifyPiHorizonNetwork(
  config: Awaited<ReturnType<typeof getPiNetworkConfig>>
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(config.horizonUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Horizon Pi indisponible");
    const root = await response.json();
    if (root?.network_passphrase !== config.passphrase) {
      throw new Error("La passphrase Horizon ne correspond pas au réseau actif");
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function piHeaders(apiKey: string) {
  return {
    Authorization: `Key ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export interface PiPayment {
  identifier: string;
  amount: number;
  user_uid?: string;
  memo?: string;
  metadata?: Record<string, any>;
  status?: {
    developer_approved?: boolean;
    transaction_verified?: boolean;
    developer_completed?: boolean;
    cancelled?: boolean;
    user_cancelled?: boolean;
  };
  transaction?: {
    txid?: string;
    verified?: boolean;
    _link?: string;
  } | null;
}

/** Recupere les details d'un paiement Pi. Retourne null si introuvable. */
export async function getPiPayment(paymentId: string): Promise<PiPayment | null> {
  try {
    const config = await getPiNetworkConfig();
    await verifyPiHorizonNetwork(config);
    const res = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      headers: piHeaders(config.apiKey),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PiPayment;
  } catch (e) {
    console.error("[PIMPAY] getPiPayment error:", e);
    return null;
  }
}

/** Approuve un paiement Pi (idempotent : "already approved" est traite comme un succes). */
export async function approvePiPayment(paymentId: string): Promise<boolean> {
  try {
    const config = await getPiNetworkConfig();
    await verifyPiHorizonNetwork(config);
    const res = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/approve`, {
      method: "POST",
      headers: piHeaders(config.apiKey),
      cache: "no-store",
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    return data?.message === "Payment already approved";
  } catch (e) {
    console.error("[PIMPAY] approvePiPayment error:", e);
    return false;
  }
}

/** Annule un paiement Pi (idempotent : "already" est traite comme un succes). */
export async function cancelPiPayment(paymentId: string): Promise<boolean> {
  try {
    const config = await getPiNetworkConfig();
    await verifyPiHorizonNetwork(config);
    const res = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: piHeaders(config.apiKey),
      cache: "no-store",
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.message?.includes("already"));
  } catch (e) {
    console.error("[PIMPAY] cancelPiPayment error:", e);
    return false;
  }
}

export interface CompleteResult {
  ok: boolean;
  alreadyCompleted: boolean;
  status: number;
  data: any;
}

/**
 * Complete un paiement Pi avec retry.
 *
 * Pourquoi le retry est crucial : juste apres la signature de l'utilisateur,
 * le txid n'est pas toujours confirme sur la blockchain. L'API Pi peut alors
 * renvoyer une erreur transitoire ("not ready", 5xx). Sans retry, notre
 * /complete echoue, le wallet PimPay n'est pas mis a jour ET le compte a
 * rebours du Pi Wallet expire sans jamais marquer le paiement comme complete.
 */
export async function completePiPayment(
  paymentId: string,
  txid: string,
  opts: { retries?: number; delayMs?: number } = {}
): Promise<CompleteResult> {
  const retries = opts.retries ?? 4;
  const delayMs = opts.delayMs ?? 1500;

  let last: CompleteResult = { ok: false, alreadyCompleted: false, status: 0, data: null };
  let config: Awaited<ReturnType<typeof getPiNetworkConfig>>;
  try {
    config = await getPiNetworkConfig();
    await verifyPiHorizonNetwork(config);
  } catch (error) {
    return { ok: false, alreadyCompleted: false, status: 0, data: { error: error instanceof Error ? error.message : "Configuration Pi invalide" } };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/complete`, {
        method: "POST",
        headers: piHeaders(config.apiKey),
        body: JSON.stringify({ txid }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const alreadyCompleted = data?.message === "Payment already completed";

      if (res.ok || alreadyCompleted) {
        return { ok: true, alreadyCompleted, status: res.status, data };
      }

      last = { ok: false, alreadyCompleted: false, status: res.status, data };

      // 4xx autres que "pas encore pret" : inutile de reessayer
      const msg: string = (data?.error_message || data?.message || "").toLowerCase();
      const isTransient =
        res.status >= 500 ||
        msg.includes("not ready") ||
        msg.includes("pending") ||
        msg.includes("not found") ||
        msg.includes("processing");

      if (!isTransient) {
        return last;
      }
    } catch (e: any) {
      last = { ok: false, alreadyCompleted: false, status: 0, data: { error: e?.message } };
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }

  return last;
}
