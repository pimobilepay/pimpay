/**
 * Helpers Pi Network (Server-to-Server)
 *
 * Centralise tous les appels a l'API Pi Network (api.minepi.com) afin de
 * garantir un comportement coherent (retry, gestion des erreurs transitoires)
 * entre les routes de completion, de recuperation et le mode rescue admin.
 */

const PI_API_BASE = "https://api.minepi.com/v2";

function piHeaders() {
  const key = process.env.PI_API_KEY;
  if (!key) {
    console.warn("[PIMPAY] PI_API_KEY non configuree");
  }
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

export interface PiPayment {
  identifier: string;
  amount: number;
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
    const res = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
      headers: piHeaders(),
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
    const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: "POST",
      headers: piHeaders(),
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
    const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: piHeaders(),
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

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: piHeaders(),
        body: JSON.stringify({ txid }),
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
