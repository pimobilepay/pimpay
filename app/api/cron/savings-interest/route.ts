/**
 * GET /api/cron/savings-interest — Crédite les intérêts quotidiens.
 *
 * Idempotence à deux niveaux, indispensable car Vercel peut rejouer un CRON :
 *   1. `lastInterestAt` + `isSameUtcDay` : un produit déjà servi aujourd'hui est ignoré ;
 *   2. la référence `SVI-<id>-<YYYYMMDD>` est déterministe et la colonne
 *      `reference` est UNIQUE — même si le garde n°1 était contourné par une
 *      exécution concurrente, la base refuserait la seconde écriture.
 *
 * Comptablement, l'intérêt est un produit *créé* par l'établissement, pas un
 * transfert depuis le portefeuille : il n'utilise donc pas `postSavingsMovement`
 * (qui suppose une contrepartie portefeuille) mais écrit sa propre paire
 * d'écritures équilibrée INTEREST_EXPENSE / *_LIABILITY.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, logCronStart, logCronEnd } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { dailyInterest, isSameUtcDay, round2 } from "@/lib/savings";

export const dynamic = "force-dynamic";
/** Marge confortable : le traitement est paginé mais peut porter sur beaucoup de lignes. */
export const maxDuration = 300;

const BATCH_SIZE = 200;

/** Suffixe de date UTC utilisé dans la référence, garant de l'unicité par jour. */
function utcDayStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

interface Stats {
  scanned: number;
  credited: number;
  skipped: number;
  matured: number;
  errors: number;
  totalInterest: number;
}

/**
 * Crédite un produit dans une transaction unique.
 * Retourne l'intérêt versé, ou 0 si rien n'était dû.
 */
async function creditProduct(opts: {
  kind: "savings" | "vault";
  id: string;
  userId: string;
  balance: number;
  interestRate: number;
  currency: string;
  now: Date;
}): Promise<number> {
  const { kind, id, userId, balance, interestRate, currency, now } = opts;

  const interest = round2(dailyInterest(balance, interestRate));
  if (interest <= 0) return 0;

  const reference = `SVI-${id}-${utcDayStamp(now)}`;
  const isVault = kind === "vault";
  const description = `Intérêts quotidiens — ${isVault ? "coffre-fort" : "épargne"}`;

  await prisma.$transaction(async (tx) => {
    // Garde conditionnel : ne crédite que si le produit n'a pas déjà été servi
    // aujourd'hui. `count === 0` signale une exécution concurrente gagnante.
    const guard = isVault
      ? await tx.vault.updateMany({
          where: {
            id,
            OR: [{ lastInterestAt: null }, { lastInterestAt: { lt: startOfUtcDay(now) } }],
          },
          data: {
            amount: { increment: interest },
            totalInterest: { increment: interest },
            lastInterestAt: now,
          },
        })
      : await tx.savingsAccount.updateMany({
          where: {
            id,
            OR: [{ lastInterestAt: null }, { lastInterestAt: { lt: startOfUtcDay(now) } }],
          },
          data: {
            balance: { increment: interest },
            totalInterest: { increment: interest },
            lastInterestAt: now,
          },
        });

    if (guard.count === 0) {
      throw new AlreadyCreditedError();
    }

    const newBalance = round2(balance + interest);
    const historyData = {
      userId,
      type: "INTEREST" as const,
      amount: interest,
      penalty: 0,
      balance: newBalance,
      currency,
      reference,
      note: description,
    };

    if (isVault) {
      await tx.vaultTransaction.create({ data: { ...historyData, vaultId: id } });
    } else {
      await tx.savingsTransaction.create({ data: { ...historyData, accountId: id } });
    }

    // Partie double : charge d'intérêt au débit, dette envers le client au crédit.
    await tx.ledgerEntry.createMany({
      data: [
        {
          reference,
          account: "INTEREST_EXPENSE",
          debit: interest,
          credit: 0,
          currency,
          description,
        },
        {
          reference,
          account: isVault ? "VAULT_LIABILITY" : "SAVINGS_LIABILITY",
          debit: 0,
          credit: interest,
          currency,
          description,
        },
      ],
    });
  });

  return interest;
}

/** Erreur de contrôle : le produit a déjà été crédité aujourd'hui. */
class AlreadyCreditedError extends Error {
  constructor() {
    super("ALREADY_CREDITED");
    this.name = "AlreadyCreditedError";
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn("[CRON:savings-interest] Accès refusé — secret invalide");
    return new Response("Unauthorized", { status: 401 });
  }
  logCronStart("savings-interest", req);

  const now = new Date();
  const stats: Stats = {
    scanned: 0,
    credited: 0,
    skipped: 0,
    matured: 0,
    errors: 0,
    totalInterest: 0,
  };

  try {
    // --- 1. Comptes épargne actifs et rémunérés, paginés par curseur --------
    let cursor: string | undefined;
    for (;;) {
      const accounts = await prisma.savingsAccount.findMany({
        where: { status: "ACTIVE", balance: { gt: 0 }, interestRate: { gt: 0 } },
        select: {
          id: true,
          userId: true,
          balance: true,
          interestRate: true,
          currency: true,
          lastInterestAt: true,
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (accounts.length === 0) break;
      cursor = accounts[accounts.length - 1].id;

      for (const account of accounts) {
        stats.scanned++;
        if (account.lastInterestAt && isSameUtcDay(account.lastInterestAt, now)) {
          stats.skipped++;
          continue;
        }
        try {
          const interest = await creditProduct({ kind: "savings", ...account, now });
          if (interest > 0) {
            stats.credited++;
            stats.totalInterest = round2(stats.totalInterest + interest);
          } else {
            stats.skipped++;
          }
        } catch (error) {
          if (error instanceof AlreadyCreditedError || (error as any)?.code === "P2002") {
            stats.skipped++;
          } else {
            stats.errors++;
            console.error(`[CRON:savings-interest] Compte ${account.id} en échec:`, error);
          }
        }
      }
      if (accounts.length < BATCH_SIZE) break;
    }

    // --- 2. Coffres-forts (ACTIVE ou LOCKED) -------------------------------
    cursor = undefined;
    for (;;) {
      const vaults = await prisma.vault.findMany({
        where: {
          status: { in: ["ACTIVE", "LOCKED"] },
          amount: { gt: 0 },
          interestRate: { gt: 0 },
        },
        select: {
          id: true,
          userId: true,
          amount: true,
          interestRate: true,
          currency: true,
          lastInterestAt: true,
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (vaults.length === 0) break;
      cursor = vaults[vaults.length - 1].id;

      for (const vault of vaults) {
        stats.scanned++;
        if (vault.lastInterestAt && isSameUtcDay(vault.lastInterestAt, now)) {
          stats.skipped++;
          continue;
        }
        try {
          const interest = await creditProduct({
            kind: "vault",
            id: vault.id,
            userId: vault.userId,
            balance: vault.amount,
            interestRate: vault.interestRate,
            currency: vault.currency,
            now,
          });
          if (interest > 0) {
            stats.credited++;
            stats.totalInterest = round2(stats.totalInterest + interest);
          } else {
            stats.skipped++;
          }
        } catch (error) {
          if (error instanceof AlreadyCreditedError || (error as any)?.code === "P2002") {
            stats.skipped++;
          } else {
            stats.errors++;
            console.error(`[CRON:savings-interest] Coffre ${vault.id} en échec:`, error);
          }
        }
      }
      if (vaults.length < BATCH_SIZE) break;
    }

    // --- 3. Dépôts à terme arrivés à échéance ------------------------------
    const matured = await prisma.savingsAccount.updateMany({
      where: { status: "ACTIVE", type: "FIXED_DEPOSIT", maturityDate: { lte: now } },
      data: { status: "MATURED" },
    });
    stats.matured = matured.count;

    logCronEnd("savings-interest", { ...stats });
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("[CRON:savings-interest] Échec global:", error);
    logCronEnd("savings-interest", { ...stats, fatal: 1 });
    return NextResponse.json({ error: "Erreur Cron", ...stats }, { status: 500 });
  }
}
