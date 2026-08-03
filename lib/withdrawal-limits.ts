import { Prisma } from "@prisma/client";
import {
  DEFAULT_LIMITS,
  resolveUserLimits,
  isKycVerifiedStatus,
  type EffectiveLimits,
  type LimitChannel,
  type ResolvedLimits,
} from "@/lib/limits-policy";

/**
 * Politique de sortie de fonds PimPay (denominee en Pi).
 *
 * IMPORTANT : les plafonds ne sont plus codes en dur. Ils proviennent de la
 * table `LimitPolicy` administree depuis /admin/limits (voir lib/limits-policy.ts),
 * qui permet a l'admin de definir des exceptions par role (ADMIN, AGENT,
 * MERCHANT, USER...) ou pour une selection d'utilisateurs precis.
 *
 * Les valeurs ci-dessous ne servent plus que de filet de securite lorsqu'aucune
 * politique n'est definie ou que la base est indisponible.
 */
export const WITHDRAWAL_POLICY = {
  /** Au-dela de ce montant (Pi), le KYC est obligatoire. */
  KYC_FREE_LIMIT_PI: DEFAULT_LIMITS.kycFreeLimitPi,
  /** Plafond par transaction (Pi) pour un compte KYC verifie. */
  KYC_MAX_PER_TX_PI: DEFAULT_LIMITS.kycMaxPerTxPi,
  /** Au-dela de ce montant (Pi), validation admin obligatoire. */
  ADMIN_APPROVAL_THRESHOLD_PI: DEFAULT_LIMITS.adminApprovalThresholdPi,
  /** Nombre maximum de retraits autorises par jour et par utilisateur. */
  MAX_PER_DAY: DEFAULT_LIMITS.maxPerDay,
} as const;

/** Erreur metier dediee aux violations de politique de retrait. */
export class WithdrawalPolicyError extends Error {
  status: number;
  code: string;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "WithdrawalPolicyError";
    this.code = code;
    this.status = status;
  }
}

/** Un compte est considere verifie si son KYC est VERIFIED ou APPROVED. */
export function isKycVerified(kycStatus?: string | null): boolean {
  return isKycVerifiedStatus(kycStatus);
}

/** Re-export pratique : resolution des plafonds administres. */
export { resolveUserLimits };
export type { EffectiveLimits, LimitChannel, ResolvedLimits };

/**
 * Accepte aussi bien le client Prisma global qu'un client transactionnel
 * (le sous-ensemble dont on a besoin : transaction.count / aggregate).
 */
type TxCounter = {
  transaction: {
    count: (args: Prisma.TransactionCountArgs) => Promise<number>;
    aggregate?: (args: any) => Promise<any>;
  };
};

const OUTGOING_TYPES = ["WITHDRAW", "WITHDRAWAL", "CARD_WITHDRAW"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Verifie que l'utilisateur n'a pas depasse le nombre de retraits quotidiens.
 * `max` non fourni => plafond resolu depuis les politiques admin.
 */
export async function assertDailyWithdrawalCount(
  db: TxCounter,
  userId: string,
  max?: number
): Promise<void> {
  const effectiveMax =
    max ?? (await resolveUserLimits({ userId, channel: "WITHDRAW" })).maxPerDay;

  const count = await db.transaction.count({
    where: {
      fromUserId: userId,
      type: { in: OUTGOING_TYPES as any },
      createdAt: { gte: startOfToday() },
      status: { notIn: ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"] as any },
    },
  });

  if (count >= effectiveMax) {
    throw new WithdrawalPolicyError(
      `Limite de ${effectiveMax} retraits par jour atteinte. Reessayez demain.`,
      "DAILY_LIMIT_REACHED",
      429
    );
  }
}

/**
 * Verifie le volume cumule du jour (Pi) quand un plafond journalier est defini.
 */
export async function assertDailyVolume(
  db: TxCounter,
  params: { userId: string; amountPi: number; dailyTotalPi: number }
): Promise<void> {
  if (!params.dailyTotalPi || params.dailyTotalPi <= 0) return;
  if (typeof db.transaction.aggregate !== "function") return;

  const agg = await db.transaction.aggregate({
    _sum: { amount: true },
    where: {
      fromUserId: params.userId,
      currency: "PI",
      createdAt: { gte: startOfToday() },
      status: { notIn: ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"] },
    },
  });

  const already = Number(agg?._sum?.amount || 0);
  if (already + params.amountPi > params.dailyTotalPi) {
    throw new WithdrawalPolicyError(
      `Plafond journalier de ${params.dailyTotalPi} Pi atteint (${already.toFixed(2)} Pi deja utilises).`,
      "DAILY_VOLUME_REACHED",
      429
    );
  }
}

/**
 * Applique la politique KYC + plafonds (denominee en Pi) a un montant donne.
 * `limits` non fourni => valeurs par defaut (utiliser enforcePiPolicy ou
 * resolveUserLimits pour beneficier des exceptions admin).
 */
export function evaluatePiWithdrawal(params: {
  amountPi: number;
  kycStatus?: string | null;
  limits?: EffectiveLimits;
}): { requiresAdminApproval: boolean } {
  const { amountPi, kycStatus } = params;
  const limits = params.limits ?? DEFAULT_LIMITS;
  const verified = isKycVerified(kycStatus) || limits.bypassKyc;

  // 0. Montant minimum eventuellement impose par l'admin.
  if (limits.minPerTxPi && amountPi < limits.minPerTxPi) {
    throw new WithdrawalPolicyError(
      `Le montant minimum par transaction est de ${limits.minPerTxPi} Pi.`,
      "MIN_TX_LIMIT",
      400
    );
  }

  // 1. KYC obligatoire au-dela de la franchise sans verification.
  if (!verified && amountPi > limits.kycFreeLimitPi) {
    throw new WithdrawalPolicyError(
      `Verification KYC requise pour retirer plus de ${limits.kycFreeLimitPi} Pi.`,
      "KYC_REQUIRED",
      403
    );
  }

  // 2. Plafond par transaction pour les comptes verifies.
  if (verified && amountPi > limits.kycMaxPerTxPi) {
    throw new WithdrawalPolicyError(
      `Le montant maximum par transaction est de ${limits.kycMaxPerTxPi} Pi.`,
      "PER_TX_LIMIT",
      400
    );
  }

  // 3. Grand montant => validation admin obligatoire.
  const requiresAdminApproval = amountPi > limits.adminApprovalThresholdPi;

  return { requiresAdminApproval };
}

/**
 * Politique de sortie de fonds UNIFIEE (denominee en Pi), plafonds administres.
 *
 * A appeler sur TOUTES les routes de transactions sortantes (retrait, transfert,
 * mpay, envoi crypto) afin de garantir un comportement coherent :
 *
 *  1. KYC obligatoire au-dela du plafond libre (comptes non verifies).
 *  2. Plafond par transaction pour les comptes verifies.
 *  3. Limite du nombre d'operations par jour.
 *  4. Plafond de volume journalier (si defini par l'admin).
 *  5. Validation admin obligatoire pour les gros montants.
 */
export async function enforcePiPolicy(
  db: TxCounter,
  params: {
    userId: string;
    amountPi: number;
    kycStatus?: string | null;
    role?: string | null;
    countDaily?: boolean;
    channel?: LimitChannel;
  }
): Promise<{ requiresAdminApproval: boolean; verified: boolean; limits: ResolvedLimits }> {
  const limits = await resolveUserLimits({
    userId: params.userId,
    role: params.role,
    kycStatus: params.kycStatus,
    channel: params.channel,
  });

  const verified = limits.verified || limits.bypassKyc;

  // Limite journaliere en nombre : appliquee aux comptes NON verifies.
  if (!verified && params.countDaily !== false) {
    await assertDailyWithdrawalCount(db, params.userId, limits.maxPerDay);
  }

  // Plafond de volume journalier (tous comptes) si l'admin en a defini un.
  if (limits.dailyTotalPi) {
    await assertDailyVolume(db, {
      userId: params.userId,
      amountPi: params.amountPi,
      dailyTotalPi: limits.dailyTotalPi,
    });
  }

  const { requiresAdminApproval } = evaluatePiWithdrawal({
    amountPi: params.amountPi,
    kycStatus: params.kycStatus,
    limits,
  });

  return { requiresAdminApproval, verified, limits };
}

/**
 * Convertit un montant d'une devise vers son equivalent en Pi.
 * - "PI" : identite.
 * - "USD" : amount / prix du Pi en USD.
 * Retourne null si la conversion n'est pas disponible pour la devise.
 */
export function toPiEquivalent(
  amount: number,
  currency: string,
  piPriceUsd: number
): number | null {
  const cur = currency.toUpperCase();
  if (cur === "PI") return amount;
  if (cur === "USD" && piPriceUsd > 0) return amount / piPriceUsd;
  return null;
}
