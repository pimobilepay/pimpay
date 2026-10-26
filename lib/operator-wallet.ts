/**
 * OPERATOR WALLET — PimPay
 *
 * SOURCE UNIQUE de l'encaissement des frais de la plateforme.
 *
 * Règle métier : **chaque frais prélevé à un utilisateur est crédité sur le
 * wallet opérateur**, dans sa devise d'origine (PI, XAF, USDT, BTC, SDA…).
 * Aucune conversion n'est faite à l'encaissement : la comptabilité reste
 * exacte et une conversion (ex: vers Pi) reste possible ensuite côté admin.
 *
 * Garanties :
 *  - ATOMIQUE      : solde du wallet + transaction + écritures comptables
 *                    sont écrits dans une seule transaction Prisma.
 *  - IDEMPOTENT    : la référence `FEE-<transactionId>` est unique en base.
 *                    Un double appel (retry, webhook rejoué, balayage) ne
 *                    crédite jamais deux fois.
 *  - TRAÇABLE      : chaque frais génère une transaction FEE_COLLECTION et
 *                    deux écritures LedgerEntry (FEES_INCOME / OPERATOR_WALLET).
 *
 * Le wallet opérateur est un utilisateur système dédié (`pimpay_operator`)
 * avec un wallet de type OPERATOR par devise, aligné sur les adresses
 * centrales on-chain déclarées dans `lib/fee-collector.ts`.
 */

import { prisma } from "@/lib/prisma";
import { getCentralFeeAddress, getFeeNetwork } from "@/lib/fee-collector";

/* ------------------------------------------------------------------ */
/*  CONSTANTES                                                         */
/* ------------------------------------------------------------------ */

/** Identifiant de l'utilisateur système qui porte les wallets opérateur. */
export const OPERATOR_USER_ID = "pimpay_operator";

/** Comptes du grand livre utilisés pour les frais. */
export const LEDGER_FEES_INCOME = "FEES_INCOME";
export const LEDGER_OPERATOR_WALLET = "OPERATOR_WALLET";

/** Devises considérées comme fiat (arrondi à 2 décimales). */
const FIAT_CURRENCIES = new Set([
  "XAF",
  "XOF",
  "USD",
  "EUR",
  "CDF",
  "NGN",
  "AED",
  "CNY",
  "VND",
  "MGA",
  "GHS",
  "KES",
  "ZAR",
]);

/** Montant minimum encaissé (évite les écritures à 0). */
const MIN_FEE_AMOUNT = 1e-8;

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export interface CreditFeeInput {
  /** Montant du frais, dans sa devise d'origine. */
  amount: number;
  /** Devise du frais (PI, XAF, USDT, BTC, SDA…). */
  currency: string;
  /** ID de la transaction d'origine — sert de clé d'idempotence. */
  sourceTransactionId?: string | null;
  /** Référence lisible de la transaction d'origine. */
  sourceReference?: string | null;
  /** Nature du frais (transfer, withdraw, deposit_mobile, exchange…). */
  feeType?: string;
  /** Description libre affichée dans l'historique admin. */
  description?: string;
  /** Métadonnées additionnelles. */
  metadata?: Record<string, unknown>;
}

export interface CreditFeeResult {
  success: boolean;
  /** true si le frais était déjà encaissé (idempotence). */
  alreadyCollected: boolean;
  amount: number;
  currency: string;
  walletId?: string;
  reference?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function normalizeCurrency(currency: string): string {
  const c = (currency || "").trim().toUpperCase();
  if (!c) return "USD";
  if (c === "SIDRA") return "SDA";
  return c;
}

/** Arrondit selon la nature de la devise (2 déc. fiat, 8 déc. crypto). */
export function roundFee(amount: number, currency: string): number {
  const decimals = FIAT_CURRENCIES.has(normalizeCurrency(currency)) ? 2 : 8;
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

/**
 * Garantit l'existence de l'utilisateur système opérateur.
 * Idempotent : ne fait rien si l'utilisateur existe déjà.
 */
export async function ensureOperatorUser() {
  const existing = await prisma.user.findUnique({
    where: { id: OPERATOR_USER_ID },
    select: { id: true },
  });
  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: {
        id: OPERATOR_USER_ID,
        username: OPERATOR_USER_ID,
        name: "PimPay Operator",
        firstName: "PimPay",
        lastName: "Operator",
        role: "ADMIN",
        status: "ACTIVE",
        kycStatus: "VERIFIED",
        dailyLimit: 0,
        monthlyLimit: 0,
      },
      select: { id: true },
    });
  } catch {
    // Course entre deux appels concurrents : l'utilisateur existe désormais.
    return prisma.user.findUnique({
      where: { id: OPERATOR_USER_ID },
      select: { id: true },
    });
  }
}

/**
 * Retourne (en le créant si besoin) le wallet opérateur d'une devise.
 * Un wallet par devise, type OPERATOR pour l'exclure des soldes utilisateurs.
 */
export async function ensureOperatorWallet(currency: string) {
  const curr = normalizeCurrency(currency);
  await ensureOperatorUser();

  return prisma.wallet.upsert({
    where: { userId_currency: { userId: OPERATOR_USER_ID, currency: curr } },
    update: {},
    create: {
      userId: OPERATOR_USER_ID,
      currency: curr,
      balance: 0,
      type: "OPERATOR",
    },
  });
}

/* ------------------------------------------------------------------ */
/*  ENCAISSEMENT D'UN FRAIS                                            */
/* ------------------------------------------------------------------ */

/**
 * Crédite un frais de plateforme sur le wallet opérateur, dans sa devise
 * d'origine. C'est LE point d'entrée unique : toute route qui prélève un
 * frais doit l'appeler.
 *
 * L'appel est idempotent par `sourceTransactionId` : rejouer un webhook ou
 * relancer le balayage ne crédite jamais le frais deux fois.
 */
export async function creditOperatorFee(
  input: CreditFeeInput
): Promise<CreditFeeResult> {
  const currency = normalizeCurrency(input.currency);
  const amount = roundFee(Number(input.amount) || 0, currency);

  if (!Number.isFinite(amount) || amount < MIN_FEE_AMOUNT) {
    return { success: true, alreadyCollected: false, amount: 0, currency };
  }

  // Clé d'idempotence : un seul encaissement par transaction d'origine.
  const idempotencyKey =
    input.sourceTransactionId ||
    input.sourceReference ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const reference = `FEE-${idempotencyKey}`;

  try {
    const wallet = await ensureOperatorWallet(currency);

    const existing = await prisma.transaction.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (existing) {
      return {
        success: true,
        alreadyCollected: true,
        amount,
        currency,
        walletId: wallet.id,
        reference,
      };
    }

    const network = getFeeNetwork(currency);
    const centralAddress = getCentralFeeAddress(currency);
    const description =
      input.description ||
      `Frais plateforme ${input.feeType ? `(${input.feeType}) ` : ""}${amount} ${currency}`;

    await prisma.$transaction(async (tx) => {
      // 1. Créditer le wallet opérateur de la devise du frais.
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      // 2. Historiser l'encaissement (unique sur `reference` → idempotent).
      await tx.transaction.create({
        data: {
          reference,
          amount,
          netAmount: amount,
          fee: 0,
          currency,
          type: "FEE_COLLECTION",
          status: "SUCCESS",
          toUserId: OPERATOR_USER_ID,
          toWalletId: wallet.id,
          description,
          metadata: {
            ...(input.metadata || {}),
            feeType: input.feeType || null,
            feeCurrency: currency,
            feeAmount: amount,
            sourceTransactionId: input.sourceTransactionId || null,
            sourceTransactionRef: input.sourceReference || null,
            network,
            centralAddress,
            collectedAt: new Date().toISOString(),
          },
        },
      });

      // 3. Double écriture comptable : produit de frais / wallet opérateur.
      await tx.ledgerEntry.createMany({
        data: [
          {
            reference,
            transactionId: input.sourceTransactionId || null,
            account: LEDGER_OPERATOR_WALLET,
            description,
            debit: amount,
            credit: 0,
            currency,
            type: "AUTO",
            createdBy: OPERATOR_USER_ID,
          },
          {
            reference,
            transactionId: input.sourceTransactionId || null,
            account: LEDGER_FEES_INCOME,
            description,
            debit: 0,
            credit: amount,
            currency,
            type: "AUTO",
            createdBy: OPERATOR_USER_ID,
          },
        ],
      });
    });

    console.log(
      `[OPERATOR_FEE] +${amount} ${currency} -> wallet operateur (${reference})`
    );

    return {
      success: true,
      alreadyCollected: false,
      amount,
      currency,
      walletId: wallet.id,
      reference,
    };
  } catch (error: any) {
    // Violation d'unicité = encaissement concurrent déjà enregistré.
    if (error?.code === "P2002") {
      return {
        success: true,
        alreadyCollected: true,
        amount,
        currency,
        reference,
      };
    }
    console.error("[OPERATOR_FEE] Echec encaissement:", error?.message);
    return {
      success: false,
      alreadyCollected: false,
      amount,
      currency,
      reference,
      error: error?.message || "Erreur inconnue",
    };
  }
}

/**
 * Variante « fire and forget » pour les routes qui ne doivent jamais échouer
 * à cause de la comptabilisation d'un frais.
 */
export function creditOperatorFeeSafe(input: CreditFeeInput): void {
  creditOperatorFee(input).catch((e) =>
    console.error("[OPERATOR_FEE] Erreur non bloquante:", e?.message)
  );
}

/* ------------------------------------------------------------------ */
/*  LECTURE DES SOLDES                                                 */
/* ------------------------------------------------------------------ */

export interface OperatorBalance {
  currency: string;
  balance: number;
  network: ReturnType<typeof getFeeNetwork>;
  centralAddress: string;
  walletId: string;
}

/** Soldes réels du wallet opérateur, devise par devise. */
export async function getOperatorBalances(): Promise<OperatorBalance[]> {
  const wallets = await prisma.wallet.findMany({
    where: { userId: OPERATOR_USER_ID },
    orderBy: { currency: "asc" },
    select: { id: true, currency: true, balance: true },
  });

  return wallets.map((w) => ({
    currency: w.currency,
    balance: w.balance,
    network: getFeeNetwork(w.currency),
    centralAddress: getCentralFeeAddress(w.currency),
    walletId: w.id,
  }));
}

/** Total des frais encaissés par devise (transactions FEE_COLLECTION). */
export async function getCollectedFeeTotals(): Promise<
  Record<string, { total: number; count: number }>
> {
  const groups = await prisma.transaction.groupBy({
    by: ["currency"],
    where: { type: "FEE_COLLECTION", status: "SUCCESS" },
    _sum: { amount: true },
    _count: true,
  });

  const out: Record<string, { total: number; count: number }> = {};
  for (const g of groups) {
    out[g.currency] = { total: g._sum.amount || 0, count: g._count };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  BALAYAGE DES FRAIS NON ENCAISSÉS                                   */
/* ------------------------------------------------------------------ */

export interface SweepResult {
  scanned: number;
  collected: number;
  skipped: number;
  failed: number;
  totalsByCurrency: Record<string, number>;
}

/**
 * Filet de sécurité : parcourt les transactions réussies porteuses d'un frais
 * et crédite sur le wallet opérateur celles qui n'ont pas encore été
 * encaissées. Utilisable en rattrapage (historique) comme en tâche planifiée.
 */
export async function sweepUncollectedFees(limit = 500): Promise<SweepResult> {
  const result: SweepResult = {
    scanned: 0,
    collected: 0,
    skipped: 0,
    failed: 0,
    totalsByCurrency: {},
  };

  const candidates = await prisma.transaction.findMany({
    where: {
      fee: { gt: 0 },
      status: "SUCCESS",
      type: { notIn: ["FEE_COLLECTION", "FEE_CONVERSION"] },
    },
    select: { id: true, reference: true, fee: true, currency: true, type: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  result.scanned = candidates.length;
  if (candidates.length === 0) return result;

  // Un seul aller-retour pour savoir ce qui est déjà encaissé.
  const alreadyCollected = new Set(
    (
      await prisma.transaction.findMany({
        where: { reference: { in: candidates.map((c) => `FEE-${c.id}`) } },
        select: { reference: true },
      })
    ).map((t) => t.reference)
  );

  for (const candidate of candidates) {
    if (alreadyCollected.has(`FEE-${candidate.id}`)) {
      result.skipped++;
      continue;
    }

    const credit = await creditOperatorFee({
      amount: candidate.fee || 0,
      currency: candidate.currency,
      sourceTransactionId: candidate.id,
      sourceReference: candidate.reference,
      feeType: candidate.type,
      description: `Frais ${candidate.type} — ${candidate.reference}`,
      metadata: { sweep: true },
    });

    if (!credit.success) {
      result.failed++;
    } else if (credit.alreadyCollected) {
      result.skipped++;
    } else if (credit.amount > 0) {
      result.collected++;
      result.totalsByCurrency[credit.currency] =
        (result.totalsByCurrency[credit.currency] || 0) + credit.amount;
    } else {
      result.skipped++;
    }
  }

  return result;
}
