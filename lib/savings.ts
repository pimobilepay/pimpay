/**
 * lib/savings.ts — Couche métier Épargne + Coffre-fort.
 *
 * Point unique de vérité partagé par les routes utilisateur, les routes admin
 * et le CRON d'intérêts. Toute mutation d'argent passe par `postSavingsMovement`
 * afin de garantir :
 *   - l'atomicité (une seule `prisma.$transaction`) ;
 *   - l'absence de découvert, via des `updateMany` conditionnels sur le solde
 *     (équivalent d'un SELECT ... FOR UPDATE : si la condition n'est plus vraie
 *     au moment de l'écriture, `count` vaut 0 et on annule) ;
 *   - la traçabilité en partie double dans `LedgerEntry` ;
 *   - l'idempotence par `reference` unique.
 *
 * NOTE : ne pas confondre avec `lib/vault.ts`, qui concerne le chiffrement de
 * secrets (KMS) et n'a aucun rapport avec le coffre-fort d'épargne.
 */

import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import type { Prisma, SavingsTxType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Plafond par opération, garde-fou contre les montants aberrants / erreurs de saisie. */
export const MAX_MOVEMENT_AMOUNT = 500_000_000;

/** Taux annuels de repli si aucune grille `InterestRate` active n'est configurée. */
export const FALLBACK_RATES: Record<string, number> = {
  REGULAR: 3.5,
  FIXED_DEPOSIT: 6.5,
  RECURRING: 4.5,
  GOAL_BASED: 4,
};

/** Pénalité par défaut appliquée au déblocage anticipé d'un coffre (en %). */
export const DEFAULT_PENALTY_RATE = 5;

/** Comptes du grand livre utilisés par la fonctionnalité. */
const LEDGER = {
  USER: "USER_LIABILITY",
  SAVINGS: "SAVINGS_LIABILITY",
  VAULT: "VAULT_LIABILITY",
  PENALTY: "PENALTY_INCOME",
} as const;

// ---------------------------------------------------------------------------
// Erreur métier transportant un code HTTP
// ---------------------------------------------------------------------------

export class SavingsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SavingsError";
    this.status = status;
  }
}

/**
 * Traduit une erreur en réponse HTTP exploitable.
 * Les erreurs inattendues restent volontairement opaques côté client.
 */
export function toErrorResponse(error: unknown): { error: string; status: number } {
  if (error instanceof SavingsError) {
    return { error: error.message, status: error.status };
  }
  // Violation de contrainte unique sur `reference` => rejeu de la même opération.
  if (typeof error === "object" && error !== null && (error as any).code === "P2002") {
    return { error: "Cette opération a déjà été traitée.", status: 409 };
  }
  console.error("[SAVINGS] Erreur inattendue:", error);
  return { error: "Erreur serveur. Veuillez réessayer.", status: 500 };
}

// ---------------------------------------------------------------------------
// Utilitaires numériques
// ---------------------------------------------------------------------------

/** Arrondi monétaire à 2 décimales, sans dérive de virgule flottante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Valide et normalise un montant reçu du client.
 * Lève une `SavingsError` explicite plutôt que de laisser passer un NaN.
 */
export function parseAmount(raw: unknown, label = "Le montant"): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    throw new SavingsError(`${label} est invalide.`);
  }
  if (value <= 0) {
    throw new SavingsError(`${label} doit être supérieur à zéro.`);
  }
  if (value > MAX_MOVEMENT_AMOUNT) {
    throw new SavingsError(
      `${label} dépasse le plafond autorisé de ${MAX_MOVEMENT_AMOUNT.toLocaleString("fr-FR")}.`
    );
  }
  return round2(value);
}

/** Numéro de compte épargne lisible et unique. */
export function generateAccountNumber(): string {
  return `EPG-${Date.now().toString().slice(-8)}-${nanoid(4).toUpperCase()}`;
}

/**
 * Référence de mouvement.
 * Si le client fournit une clé d'idempotence, la référence devient déterministe :
 * un double-clic produit la même référence et se heurte à la contrainte unique.
 */
export function buildReference(prefix: string, idempotencyKey?: string | null): string {
  const suffix = idempotencyKey
    ? idempotencyKey.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40)
    : nanoid(12);
  return `${prefix}-${suffix}`;
}

/** Intérêt journalier sur base annuelle 365 jours. */
export function dailyInterest(balance: number, annualRate: number): number {
  if (balance <= 0 || annualRate <= 0) return 0;
  return (balance * (annualRate / 100)) / 365;
}

/** Pénalité de déblocage anticipé. */
export function earlyPenalty(amount: number, penaltyRate: number): number {
  if (amount <= 0 || penaltyRate <= 0) return 0;
  return round2((amount * penaltyRate) / 100);
}

/** Vrai si les deux dates tombent le même jour UTC (base de l'idempotence du CRON). */
export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// ---------------------------------------------------------------------------
// Sécurité
// ---------------------------------------------------------------------------

/**
 * Vérifie le code PIN de l'utilisateur (même politique que /api/user/verify-pin).
 * Exigé pour tout mouvement sortant : retrait, déblocage, fermeture.
 */
export async function assertPin(userId: string, rawPin: unknown): Promise<void> {
  const pin = String(rawPin ?? "");
  if (!/^\d{4}$|^\d{6}$/.test(pin)) {
    throw new SavingsError("Le code PIN doit contenir 4 ou 6 chiffres.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pin: true },
  });
  if (!user) throw new SavingsError("Utilisateur introuvable.", 404);
  if (!user.pin) {
    throw new SavingsError("Aucun code PIN configuré. Configurez-le avant cette opération.", 403);
  }

  const ok = await bcrypt.compare(pin, user.pin);
  if (!ok) {
    console.warn(`[SAVINGS] PIN incorrect pour l'utilisateur ${userId}`);
    throw new SavingsError("Code PIN incorrect.");
  }
}

// ---------------------------------------------------------------------------
// Règles de blocage
// ---------------------------------------------------------------------------

/**
 * Vérifie qu'un compte épargne autorise un retrait partiel maintenant.
 * Un dépôt à terme non arrivé à maturité ne peut être que clôturé (fermeture
 * anticipée), jamais partiellement débité.
 */
export function assertSavingsWithdrawable(
  account: { type: string; status: string; maturityDate: Date | null },
  now = new Date()
): void {
  if (account.status === "FROZEN") {
    throw new SavingsError("Ce compte est gelé. Contactez le support.", 403);
  }
  if (account.status === "CLOSED") {
    throw new SavingsError("Ce compte est clôturé.");
  }
  if (
    account.type === "FIXED_DEPOSIT" &&
    account.maturityDate &&
    now < account.maturityDate
  ) {
    const date = account.maturityDate.toLocaleDateString("fr-FR");
    throw new SavingsError(
      `Ce dépôt à terme est bloqué jusqu'au ${date}. Vous pouvez le clôturer par anticipation.`
    );
  }
}

/** Vrai si le coffre est encore sous verrou temporel. */
export function isVaultLocked(
  vault: { lockUntil: Date | null },
  now = new Date()
): boolean {
  return !!vault.lockUntil && now < vault.lockUntil;
}

// ---------------------------------------------------------------------------
// Grille de taux
// ---------------------------------------------------------------------------

/**
 * Taux applicable pour un type de produit et une devise.
 * Repli sur `FALLBACK_RATES` si aucune grille active n'existe en base.
 */
export async function resolveInterestRate(type: string, currency: string): Promise<number> {
  const grid = await prisma.interestRate.findFirst({
    where: { type, currency, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (grid) return grid.defaultRate;
  return FALLBACK_RATES[type] ?? FALLBACK_RATES.REGULAR;
}

// ---------------------------------------------------------------------------
// Mouvement d'argent atomique
// ---------------------------------------------------------------------------

export type MovementTarget =
  | { kind: "savings"; id: string }
  | { kind: "vault"; id: string };

export interface MovementInput {
  userId: string;
  target: MovementTarget;
  /** IN = portefeuille vers produit d'épargne. OUT = produit vers portefeuille. */
  direction: "IN" | "OUT";
  amount: number;
  /** Pénalité retenue sur un mouvement sortant. Le net crédité vaut amount - penalty. */
  penalty?: number;
  txType: SavingsTxType;
  currency: string;
  description: string;
  note?: string | null;
  reference: string;
  /** Passe le produit dans un nouveau statut à l'issue du mouvement. */
  newStatus?: string;
}

export interface MovementResult {
  reference: string;
  amount: number;
  penalty: number;
  netAmount: number;
  productBalance: number;
  walletBalance: number;
}

/**
 * Exécute un mouvement entre le portefeuille FIAT et un produit d'épargne.
 *
 * Le solde n'est jamais lu depuis le client : il est relu puis muté sous
 * condition à l'intérieur de la transaction. Si un autre mouvement concurrent
 * a vidé le solde entre-temps, l'`updateMany` ne touche aucune ligne et
 * l'ensemble de la transaction est annulé.
 */
export async function postSavingsMovement(input: MovementInput): Promise<MovementResult> {
  const {
    userId,
    target,
    direction,
    txType,
    currency,
    description,
    note,
    reference,
    newStatus,
  } = input;

  const amount = round2(input.amount);
  const penalty = round2(input.penalty ?? 0);
  if (penalty > amount) {
    throw new SavingsError("La pénalité ne peut excéder le montant du mouvement.");
  }
  const netAmount = round2(amount - penalty);
  const isVault = target.kind === "vault";

  return prisma.$transaction(async (tx) => {
    // --- 1. Portefeuille FIAT dans la devise du produit ------------------
    let wallet = await tx.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
      select: { id: true, balance: true },
    });

    if (!wallet) {
      if (direction === "IN") {
        throw new SavingsError(
          `Aucun portefeuille ${currency} trouvé. Approvisionnez-le avant d'épargner.`
        );
      }
      // Mouvement sortant : on crée le portefeuille pour ne pas bloquer les fonds.
      wallet = await tx.wallet.create({
        data: { userId, currency, balance: 0, type: "FIAT" },
        select: { id: true, balance: true },
      });
    }

    // --- 2. Produit d'épargne, relu à l'intérieur de la transaction ------
    const product = isVault
      ? await tx.vault.findFirst({
          where: { id: target.id, userId },
          select: { id: true, amount: true, currency: true, status: true },
        })
      : await tx.savingsAccount.findFirst({
          where: { id: target.id, userId },
          select: { id: true, balance: true, currency: true, status: true },
        });

    if (!product) {
      throw new SavingsError(
        isVault ? "Coffre-fort introuvable." : "Compte épargne introuvable.",
        404
      );
    }
    if (product.currency !== currency) {
      throw new SavingsError("La devise du mouvement ne correspond pas à celle du produit.");
    }

    // --- 3. Mutation des soldes sous condition --------------------------
    if (direction === "IN") {
      const debited = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count === 0) {
        throw new SavingsError("Solde du portefeuille insuffisant.");
      }
      if (isVault) {
        await tx.vault.update({
          where: { id: product.id },
          data: { amount: { increment: amount }, ...(newStatus ? { status: newStatus as any } : {}) },
        });
      } else {
        await tx.savingsAccount.update({
          where: { id: product.id },
          data: { balance: { increment: amount }, ...(newStatus ? { status: newStatus as any } : {}) },
        });
      }
    } else {
      const guard = isVault
        ? await tx.vault.updateMany({
            where: { id: product.id, amount: { gte: amount } },
            data: { amount: { decrement: amount }, ...(newStatus ? { status: newStatus as any } : {}) },
          })
        : await tx.savingsAccount.updateMany({
            where: { id: product.id, balance: { gte: amount } },
            data: { balance: { decrement: amount }, ...(newStatus ? { status: newStatus as any } : {}) },
          });
      if (guard.count === 0) {
        throw new SavingsError(
          isVault ? "Solde du coffre insuffisant." : "Solde du compte épargne insuffisant."
        );
      }
      if (netAmount > 0) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: netAmount } },
        });
      }
    }

    // --- 4. Soldes finaux, relus pour l'historique ----------------------
    const [finalWallet, finalProduct] = await Promise.all([
      tx.wallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true } }),
      isVault
        ? tx.vault.findUniqueOrThrow({ where: { id: product.id }, select: { amount: true } })
        : tx.savingsAccount.findUniqueOrThrow({
            where: { id: product.id },
            select: { balance: true },
          }),
    ]);
    const productBalance = round2(
      isVault ? (finalProduct as { amount: number }).amount : (finalProduct as { balance: number }).balance
    );
    const walletBalance = round2(finalWallet.balance);

    // --- 5. Historique du produit --------------------------------------
    const historyData = {
      userId,
      type: txType,
      amount,
      penalty,
      balance: productBalance,
      currency,
      reference,
      note: note ?? description,
    };
    if (isVault) {
      await tx.vaultTransaction.create({ data: { ...historyData, vaultId: product.id } });
    } else {
      await tx.savingsTransaction.create({ data: { ...historyData, accountId: product.id } });
    }

    // --- 6. Transaction globale (fil d'activité de l'utilisateur) -------
    const txTypeGlobal =
      direction === "IN"
        ? isVault
          ? "VAULT_LOCK"
          : "SAVINGS_DEPOSIT"
        : isVault
          ? "VAULT_UNLOCK"
          : "SAVINGS_WITHDRAW";

    await tx.transaction.create({
      data: {
        reference,
        amount,
        fee: penalty,
        netAmount,
        status: "SUCCESS",
        type: txTypeGlobal as any,
        currency,
        description,
        fromUserId: userId,
        toUserId: userId,
        fromWalletId: direction === "IN" ? wallet.id : null,
        toWalletId: direction === "OUT" ? wallet.id : null,
        metadata: {
          productKind: target.kind,
          productId: product.id,
          penalty,
          productBalance,
        } as Prisma.InputJsonValue,
      },
    });

    // --- 7. Grand livre en partie double -------------------------------
    const productAccount = isVault ? LEDGER.VAULT : LEDGER.SAVINGS;
    const entries: Prisma.LedgerEntryCreateManyInput[] = [];

    if (direction === "IN") {
      // Le passif « à vue » diminue, le passif « épargne » augmente.
      entries.push(
        { reference, account: LEDGER.USER, debit: amount, credit: 0, currency, description },
        { reference, account: productAccount, debit: 0, credit: amount, currency, description }
      );
    } else {
      entries.push({
        reference,
        account: productAccount,
        debit: amount,
        credit: 0,
        currency,
        description,
      });
      if (netAmount > 0) {
        entries.push({
          reference,
          account: LEDGER.USER,
          debit: 0,
          credit: netAmount,
          currency,
          description,
        });
      }
      if (penalty > 0) {
        entries.push({
          reference,
          account: LEDGER.PENALTY,
          debit: 0,
          credit: penalty,
          currency,
          description: `Pénalité — ${description}`,
        });
      }
    }
    await tx.ledgerEntry.createMany({ data: entries });

    return { reference, amount, penalty, netAmount, productBalance, walletBalance };
  });
}

// ---------------------------------------------------------------------------
// Sérialisation pour le client
// ---------------------------------------------------------------------------

/** Projection d'un compte épargne côté client (aucun champ interne exposé). */
export function serializeSavings(account: {
  id: string;
  accountNumber: string;
  name: string | null;
  type: string;
  balance: number;
  interestRate: number;
  currency: string;
  targetAmount: number | null;
  totalInterest: number;
  maturityDate: Date | null;
  status: string;
  autoDebitAmount: number | null;
  autoDebitDay: number | null;
  lastInterestAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    name: account.name || "Compte épargne",
    type: account.type,
    balance: round2(account.balance),
    interestRate: account.interestRate,
    currency: account.currency,
    targetAmount: account.targetAmount,
    totalInterest: round2(account.totalInterest),
    progress:
      account.targetAmount && account.targetAmount > 0
        ? Math.min(100, Math.round((account.balance / account.targetAmount) * 100))
        : null,
    maturityDate: account.maturityDate?.toISOString() ?? null,
    status: account.status,
    autoDebitAmount: account.autoDebitAmount,
    autoDebitDay: account.autoDebitDay,
    lastInterestAt: account.lastInterestAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    projectedYearlyInterest: round2((account.balance * account.interestRate) / 100),
  };
}

/** Projection d'un coffre-fort côté client. */
export function serializeVault(
  vault: {
    id: string;
    name: string;
    amount: number;
    targetAmount: number | null;
    interestRate: number;
    penaltyRate: number;
    currency: string;
    lockUntil: Date | null;
    status: string;
    totalInterest: number;
    createdAt: Date;
  },
  now = new Date()
) {
  const locked = isVaultLocked(vault, now);
  const daysRemaining =
    locked && vault.lockUntil
      ? Math.ceil((vault.lockUntil.getTime() - now.getTime()) / 86_400_000)
      : 0;

  return {
    id: vault.id,
    name: vault.name,
    amount: round2(vault.amount),
    targetAmount: vault.targetAmount,
    interestRate: vault.interestRate,
    penaltyRate: vault.penaltyRate,
    currency: vault.currency,
    lockUntil: vault.lockUntil?.toISOString() ?? null,
    status: vault.status,
    isLocked: locked,
    daysRemaining,
    totalInterest: round2(vault.totalInterest),
    progress:
      vault.targetAmount && vault.targetAmount > 0
        ? Math.min(100, Math.round((vault.amount / vault.targetAmount) * 100))
        : null,
    /** Pénalité qui serait retenue si l'utilisateur débloquait maintenant. */
    earlyPenaltyNow: locked ? earlyPenalty(vault.amount, vault.penaltyRate) : 0,
    createdAt: vault.createdAt.toISOString(),
  };
}
