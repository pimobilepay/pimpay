import { Prisma } from "@prisma/client";

/**
 * Politique de retrait PimPay (denominee en Pi).
 *
 * Regles metier :
 *  - Un retrait de plus de 5 Pi exige un KYC verifie.
 *  - Un utilisateur KYC verifie est plafonne a 100 Pi par transaction.
 *  - Maximum 10 transactions de retrait par jour et par utilisateur.
 *  - Un retrait KYC de plus de 50 Pi doit etre valide manuellement par un admin
 *    (les montants inferieurs peuvent etre auto-approuves).
 */
export const WITHDRAWAL_POLICY = {
  /** Au-dela de ce montant (Pi), le KYC est obligatoire. */
  KYC_FREE_LIMIT_PI: 5,
  /** Plafond par transaction (Pi) pour un compte KYC verifie. */
  KYC_MAX_PER_TX_PI: 100,
  /** Au-dela de ce montant (Pi), validation admin obligatoire. */
  ADMIN_APPROVAL_THRESHOLD_PI: 50,
  /** Nombre maximum de retraits autorises par jour et par utilisateur. */
  MAX_PER_DAY: 10,
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
  return kycStatus === "VERIFIED" || kycStatus === "APPROVED";
}

/**
 * Accepte aussi bien le client Prisma global qu'un client transactionnel
 * (le sous-ensemble dont on a besoin : transaction.count).
 */
type TxCounter = {
  transaction: {
    count: (args: Prisma.TransactionCountArgs) => Promise<number>;
  };
};

/**
 * Verifie que l'utilisateur n'a pas depasse le nombre de retraits quotidiens.
 * Compte toutes les demandes de retrait du jour qui ne sont pas annulees/echouees.
 * A appeler sur TOUTES les routes de retrait (peu importe la devise).
 */
export async function assertDailyWithdrawalCount(
  db: TxCounter,
  userId: string,
  max: number = WITHDRAWAL_POLICY.MAX_PER_DAY
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await db.transaction.count({
    where: {
      fromUserId: userId,
      type: { in: ["WITHDRAW", "WITHDRAWAL", "CARD_WITHDRAW"] },
      createdAt: { gte: startOfDay },
      status: { notIn: ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"] },
    },
  });

  if (count >= max) {
    throw new WithdrawalPolicyError(
      `Limite de ${max} retraits par jour atteinte. Reessayez demain.`,
      "DAILY_LIMIT_REACHED",
      429
    );
  }
}

/**
 * Applique la politique KYC + plafonds (denominee en Pi) a un montant donne.
 * Leve une WithdrawalPolicyError en cas de violation.
 *
 * @returns requiresAdminApproval : true si le retrait doit rester en attente
 *          d'une validation admin (grand montant), false s'il peut etre
 *          auto-approuve.
 */
export function evaluatePiWithdrawal(params: {
  amountPi: number;
  kycStatus?: string | null;
}): { requiresAdminApproval: boolean } {
  const { amountPi, kycStatus } = params;
  const verified = isKycVerified(kycStatus);

  // 1. KYC obligatoire au-dela de la franchise sans verification.
  if (!verified && amountPi > WITHDRAWAL_POLICY.KYC_FREE_LIMIT_PI) {
    throw new WithdrawalPolicyError(
      `Verification KYC requise pour retirer plus de ${WITHDRAWAL_POLICY.KYC_FREE_LIMIT_PI} Pi.`,
      "KYC_REQUIRED",
      403
    );
  }

  // 2. Plafond par transaction pour les comptes verifies.
  if (verified && amountPi > WITHDRAWAL_POLICY.KYC_MAX_PER_TX_PI) {
    throw new WithdrawalPolicyError(
      `Le montant maximum par transaction est de ${WITHDRAWAL_POLICY.KYC_MAX_PER_TX_PI} Pi.`,
      "PER_TX_LIMIT",
      400
    );
  }

  // 3. Grand montant => validation admin obligatoire.
  const requiresAdminApproval =
    amountPi > WITHDRAWAL_POLICY.ADMIN_APPROVAL_THRESHOLD_PI;

  return { requiresAdminApproval };
}

/**
 * Politique de sortie de fonds UNIFIEE (denominee en Pi).
 *
 * A appeler sur TOUTES les routes de transactions sortantes (retrait, transfert,
 * mpay, envoi crypto) afin de garantir un comportement coherent :
 *
 *  1. KYC obligatoire au-dela de 5 Pi (comptes non verifies).
 *  2. Plafond de 100 Pi par transaction pour les comptes verifies.
 *  3. Maximum 10 retraits par jour pour les comptes NON verifies.
 *  4. Validation admin obligatoire pour les gros montants (comptes verifies).
 *
 * @param db        client Prisma (global ou transactionnel) exposant transaction.count
 * @param userId    identifiant de l'utilisateur emetteur
 * @param amountPi  montant exprime en Pi (utiliser toPiEquivalent pour convertir)
 * @param kycStatus statut KYC de l'utilisateur
 * @param countDaily si false, n'applique pas la limite journaliere (ex: transfert P2P interne)
 *
 * @returns requiresAdminApproval : le retrait doit rester PENDING en attente admin.
 *          verified : true si le compte est KYC verifie.
 */
export async function enforcePiPolicy(
  db: TxCounter,
  params: {
    userId: string;
    amountPi: number;
    kycStatus?: string | null;
    countDaily?: boolean;
  }
): Promise<{ requiresAdminApproval: boolean; verified: boolean }> {
  const verified = isKycVerified(params.kycStatus);

  // Limite journaliere : appliquee aux comptes NON verifies.
  if (!verified && params.countDaily !== false) {
    await assertDailyWithdrawalCount(db, params.userId);
  }

  const { requiresAdminApproval } = evaluatePiWithdrawal({
    amountPi: params.amountPi,
    kycStatus: params.kycStatus,
  });

  return { requiresAdminApproval, verified };
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
