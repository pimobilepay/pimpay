/**
 * Provisionnement du float des agents PIMOBIPAY.
 *
 * Le "float" d'un agent est le solde de son wallet dans la devise de caisse
 * (XAF par defaut) : c'est ce solde qui est debite lors d'un cash-in client
 * et credite lors d'un cash-out.
 *
 * Un provisionnement est materialise par une Transaction :
 *   type      = DEPOSIT
 *   purpose   = AGENT_FLOAT  (permet d'isoler ces mouvements des operations
 *                             de caisse dans les statistiques agent)
 *   toUserId  = agent beneficiaire
 *   status    = PENDING  -> demande de recharge envoyee par l'agent
 *               SUCCESS  -> float credite par l'admin
 *               REJECTED -> demande refusee
 *               CANCELLED-> demande annulee par l'agent
 *
 * Aucune migration de schema n'est necessaire : le modele Transaction
 * existant porte deja `purpose`, `note` et `metadata`.
 */

export const AGENT_FLOAT_PURPOSE = "AGENT_FLOAT";

/** Devises autorisees pour le float agent. */
export const FLOAT_CURRENCIES = ["XAF", "XOF", "PI"] as const;
export type FloatCurrency = (typeof FLOAT_CURRENCIES)[number];

/** Devise de caisse par defaut (celle lue par le Hub agent). */
export const DEFAULT_FLOAT_CURRENCY: FloatCurrency = "XAF";

/** Montant maximum provisionnable en une seule operation. */
export const MAX_FLOAT_OPERATION = 50_000_000;

export function isFloatCurrency(value: unknown): value is FloatCurrency {
  return typeof value === "string" && (FLOAT_CURRENCIES as readonly string[]).includes(value);
}

/** Reference unique lisible pour un mouvement de float. */
export function floatReference(prefix: "FLTREQ" | "FLT" = "FLT"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`.toUpperCase();
}

/**
 * Valide un montant de provisionnement.
 * Retourne le montant normalise ou un message d'erreur.
 */
export function parseFloatAmount(
  raw: unknown
): { amount: number; error: null } | { amount: null; error: string } {
  const amount = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount: null, error: "Montant invalide" };
  }
  if (amount > MAX_FLOAT_OPERATION) {
    return {
      amount: null,
      error: `Montant superieur au plafond autorise (${MAX_FLOAT_OPERATION.toLocaleString("fr-FR")})`,
    };
  }
  // Deux decimales maximum.
  return { amount: Math.round(amount * 100) / 100, error: null };
}

export type FloatRequestStatus = "PENDING" | "SUCCESS" | "REJECTED" | "CANCELLED";

export interface FloatMovement {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: FloatRequestStatus;
  note: string | null;
  description: string | null;
  createdAt: string;
  /** AGENT_REQUEST (demande agent) ou ADMIN_DIRECT (provision directe). */
  source: string;
  decidedByName?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
  agent?: {
    id: string;
    name: string | null;
    username: string | null;
    phone: string | null;
    email: string | null;
    agentId: string | null;
    agentRole: string | null;
  } | null;
}
