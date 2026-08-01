/**
 * GET /api/admin/savings — Supervision de l'encours Épargne + Coffres-forts.
 *
 * Lecture seule. Fournit :
 *   - les encours agrégés par devise (comptes, coffres, intérêts servis) ;
 *   - la répartition par type de produit ;
 *   - une liste paginée et filtrable des produits, avec leur porteur ;
 *   - un contrôle de cohérence entre la somme des soldes produits et le
 *     solde des comptes de passif correspondants dans le grand livre.
 *
 * Le contrôle de cohérence est le vrai intérêt de cet écran : si l'écart
 * n'est pas nul, un mouvement a été écrit hors de `postSavingsMovement`.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { round2, isVaultLocked } from "@/lib/savings";

/** Comptes de passif alimentés par la fonctionnalité (voir lib/savings.ts). */
const SAVINGS_LEDGER_ACCOUNT = "SAVINGS_LIABILITY";
const VAULT_LEDGER_ACCOUNT = "VAULT_LIABILITY";

const PAGE_SIZE = 25;

type Bucket = { savings: number; vaults: number; interest: number; penalties: number };

export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.SAVINGS_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") === "vault" ? "vault" : "savings";
  const status = searchParams.get("status") || undefined;
  const currency = searchParams.get("currency") || undefined;
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Recherche par porteur : e-mail, téléphone ou nom.
  const userFilter = search
    ? {
        user: {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const listWhere = {
    ...(status ? { status: status as never } : {}),
    ...(currency ? { currency } : {}),
    ...userFilter,
  };

  const userSelect = {
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  };

  const [
    savingsGroups,
    vaultGroups,
    savingsByType,
    ledgerGroups,
    listItems,
    listTotal,
    frozenCount,
    lockedVaults,
  ] = await Promise.all([
    // Encours épargne par devise (les produits clôturés sont exclus des encours).
    prisma.savingsAccount.groupBy({
      by: ["currency"],
      where: { status: { not: "CLOSED" } },
      _sum: { balance: true, totalInterest: true },
      _count: { _all: true },
    }),
    prisma.vault.groupBy({
      by: ["currency"],
      where: { status: { not: "CLOSED" } },
      _sum: { amount: true, totalInterest: true },
      _count: { _all: true },
    }),
    prisma.savingsAccount.groupBy({
      by: ["type"],
      where: { status: { not: "CLOSED" } },
      _sum: { balance: true },
      _count: { _all: true },
    }),
    // Soldes du grand livre pour le contrôle de cohérence.
    prisma.ledgerEntry.groupBy({
      by: ["account", "currency"],
      where: { account: { in: [SAVINGS_LEDGER_ACCOUNT, VAULT_LEDGER_ACCOUNT] } },
      _sum: { debit: true, credit: true },
    }),
    kind === "vault"
      ? prisma.vault.findMany({
          where: listWhere,
          orderBy: { amount: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { user: userSelect },
        })
      : prisma.savingsAccount.findMany({
          where: listWhere,
          orderBy: { balance: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { user: userSelect },
        }),
    kind === "vault"
      ? prisma.vault.count({ where: listWhere })
      : prisma.savingsAccount.count({ where: listWhere }),
    prisma.savingsAccount.count({ where: { status: "FROZEN" } }),
    prisma.vault.count({ where: { status: "LOCKED" } }),
  ]);

  // --- Agrégation par devise -------------------------------------------
  const byCurrency: Record<string, Bucket> = {};
  const bucket = (cur: string): Bucket =>
    (byCurrency[cur] ??= { savings: 0, vaults: 0, interest: 0, penalties: 0 });

  for (const g of savingsGroups) {
    const b = bucket(g.currency);
    b.savings = round2(b.savings + (g._sum.balance || 0));
    b.interest = round2(b.interest + (g._sum.totalInterest || 0));
  }
  for (const g of vaultGroups) {
    const b = bucket(g.currency);
    b.vaults = round2(b.vaults + (g._sum.amount || 0));
    b.interest = round2(b.interest + (g._sum.totalInterest || 0));
  }

  // --- Contrôle de cohérence produits <-> grand livre -------------------
  // Un compte de passif est créditeur : solde = crédit - débit.
  const ledgerBalance: Record<string, Record<string, number>> = {};
  for (const g of ledgerGroups) {
    const value = round2((g._sum.credit || 0) - (g._sum.debit || 0));
    (ledgerBalance[g.account] ??= {})[g.currency] = value;
  }

  const currencies = new Set([
    ...Object.keys(byCurrency),
    ...Object.values(ledgerBalance).flatMap((m) => Object.keys(m)),
  ]);

  const reconciliation = Array.from(currencies).map((cur) => {
    const products = round2((byCurrency[cur]?.savings || 0) + (byCurrency[cur]?.vaults || 0));
    const ledger = round2(
      (ledgerBalance[SAVINGS_LEDGER_ACCOUNT]?.[cur] || 0) +
        (ledgerBalance[VAULT_LEDGER_ACCOUNT]?.[cur] || 0)
    );
    const difference = round2(products - ledger);
    return {
      currency: cur,
      productTotal: products,
      ledgerTotal: ledger,
      difference,
      // Tolérance d'un centime pour absorber les arrondis d'intérêts.
      balanced: Math.abs(difference) < 0.01,
    };
  });

  // --- Normalisation de la liste ---------------------------------------
  const now = new Date();
  const items = listItems.map((item: any) => {
    const owner = item.user;
    const displayName =
      [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
      owner?.email ||
      owner?.phone ||
      "Utilisateur";

    const base = {
      id: item.id,
      userId: item.userId,
      userName: displayName,
      userEmail: owner?.email ?? null,
      userPhone: owner?.phone ?? null,
      currency: item.currency,
      status: item.status,
      interestRate: item.interestRate,
      totalInterest: round2(item.totalInterest),
      createdAt: item.createdAt.toISOString(),
    };

    if (kind === "vault") {
      return {
        ...base,
        kind: "vault" as const,
        name: item.name,
        balance: round2(item.amount),
        lockUntil: item.lockUntil?.toISOString() ?? null,
        isLocked: isVaultLocked(item, now),
        penaltyRate: item.penaltyRate,
      };
    }

    return {
      ...base,
      kind: "savings" as const,
      name: item.name || "Compte épargne",
      accountNumber: item.accountNumber,
      balance: round2(item.balance),
      type: item.type,
      maturityDate: item.maturityDate?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    byCurrency,
    byType: savingsByType.map((g) => ({
      type: g.type,
      count: g._count._all,
      balance: round2(g._sum.balance || 0),
    })),
    counts: {
      savingsAccounts: savingsGroups.reduce((s, g) => s + g._count._all, 0),
      vaults: vaultGroups.reduce((s, g) => s + g._count._all, 0),
      frozen: frozenCount,
      locked: lockedVaults,
    },
    reconciliation,
    list: {
      kind,
      items,
      total: listTotal,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(listTotal / PAGE_SIZE)),
    },
    canManage: ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.SAVINGS_MANAGE),
  });
}
