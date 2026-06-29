export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { getPiPrice } from "@/lib/fees";
import { toUsd, DEFAULT_CRYPTO_PRICES, FIAT_RATES } from "@/lib/exchange";

function statusFor(reserves: number, liabilities: number): string {
  if (liabilities <= 0) return reserves > 0 ? "SURPLUS" : "BALANCED";
  const ratio = reserves / liabilities;
  if (ratio < 0.999) return "DEFICIT";
  if (ratio > 1.001) return "SURPLUS";
  return "BALANCED";
}

async function computeReserves() {
  const piPrice = await getPiPrice();
  const priceMap: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES, PI: piPrice };

  // Passif = soldes utilisateurs par devise
  const liabilitiesByCur = await prisma.wallet.groupBy({
    by: ["currency"],
    _sum: { balance: true },
    _count: { id: true },
  });

  // Réserves cold (custody hors-ligne) par actif
  const coldWallets = await prisma.coldWallet.findMany({ where: { isActive: true } });
  const coldByAsset = new Map<string, number>();
  coldWallets.forEach((c) => coldByAsset.set(c.asset.toUpperCase(), (coldByAsset.get(c.asset.toUpperCase()) || 0) + c.balance));

  // Réserves hot (system wallets)
  const systemWallets = await prisma.systemWallet.findMany();
  const hotPi = systemWallets.reduce((s, w) => s + w.balancePi, 0);
  const hotUsd = systemWallets.reduce((s, w) => s + w.balanceUSD, 0);
  const hotXaf = systemWallets.reduce((s, w) => s + w.balanceXAF, 0);
  const hotByAsset = new Map<string, number>([["PI", hotPi], ["USD", hotUsd], ["USDT", hotUsd], ["XAF", hotXaf]]);

  const assets = new Set<string>([
    ...liabilitiesByCur.map((l) => l.currency.toUpperCase()),
    ...Array.from(coldByAsset.keys()),
    "PI",
  ]);

  const rows = Array.from(assets).map((asset) => {
    const liab = liabilitiesByCur.find((l) => l.currency.toUpperCase() === asset)?._sum.balance || 0;
    const cold = coldByAsset.get(asset) || 0;
    const hot = hotByAsset.get(asset) || 0;
    const reserves = hot + cold;
    const price = priceMap[asset] ?? (priceMap[asset.toUpperCase()] || 0);
    return {
      asset,
      onChainHot: hot,
      onChainCold: cold,
      reserves,
      userLiabilities: liab,
      difference: reserves - liab,
      coverageRatio: liab > 0 ? reserves / liab : reserves > 0 ? 1 : 0,
      priceUSD: price,
      reservesUSD: toUsd(asset, reserves, priceMap),
      liabilitiesUSD: toUsd(asset, liab, priceMap),
      status: statusFor(reserves, liab),
    };
  }).sort((a, b) => b.liabilitiesUSD - a.liabilitiesUSD);

  const totals = rows.reduce(
    (acc, r) => ({
      reservesUSD: acc.reservesUSD + r.reservesUSD,
      liabilitiesUSD: acc.liabilitiesUSD + r.liabilitiesUSD,
    }),
    { reservesUSD: 0, liabilitiesUSD: 0 }
  );

  return { rows, totals, priceMap, coldWallets };
}

// GET — preuve de réserves + grand livre / réconciliation
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.RESERVES_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const { rows, totals } = await computeReserves();

  // Fees income (revenu) par devise
  const feesByCur = await prisma.transaction.groupBy({
    by: ["currency"],
    where: { status: "SUCCESS", fee: { gt: 0 } },
    _sum: { fee: true },
  });
  const piPrice = await getPiPrice();
  const priceMap: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES, PI: piPrice };
  const feesIncomeUSD = feesByCur.reduce((s, f) => s + toUsd(f.currency, f._sum.fee || 0, priceMap), 0);

  // Grand livre : comptes synthétiques (partie double) + ajustements manuels
  const manualEntries = await prisma.ledgerEntry.findMany({ orderBy: { entryDate: "desc" }, take: 50 });
  const manualDebit = manualEntries.reduce((s, e) => s + e.debit, 0);
  const manualCredit = manualEntries.reduce((s, e) => s + e.credit, 0);

  const ledgerAccounts = [
    { account: "HOT_WALLET", label: "Portefeuilles chauds (actif)", debit: totals.reservesUSD - rows.reduce((s, r) => s + toUsd(r.asset, r.onChainCold, priceMap), 0), credit: 0 },
    { account: "COLD_WALLET", label: "Cold wallets (actif)", debit: rows.reduce((s, r) => s + toUsd(r.asset, r.onChainCold, priceMap), 0), credit: 0 },
    { account: "USER_LIABILITY", label: "Dette envers utilisateurs (passif)", debit: 0, credit: totals.liabilitiesUSD },
    { account: "FEES_INCOME", label: "Revenus de frais (produit)", debit: 0, credit: feesIncomeUSD },
  ];
  const totalDebit = ledgerAccounts.reduce((s, a) => s + a.debit, 0) + manualDebit;
  const totalCredit = ledgerAccounts.reduce((s, a) => s + a.credit, 0) + manualCredit;

  // Snapshots historiques
  const snapshots = await prisma.reserveSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 40 });

  return NextResponse.json({
    reserves: {
      rows,
      totals,
      globalCoverage: totals.liabilitiesUSD > 0 ? totals.reservesUSD / totals.liabilitiesUSD : 1,
    },
    ledger: {
      accounts: ledgerAccounts,
      manualEntries,
      totalDebit,
      totalCredit,
      discrepancy: totalDebit - totalCredit,
    },
    snapshots,
  });
}

// POST — snapshot de réserves / écriture manuelle de grand livre
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.RESERVES_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    if (action === "snapshot") {
      const { rows } = await computeReserves();
      const created = await prisma.$transaction(
        rows.map((r) =>
          prisma.reserveSnapshot.create({
            data: {
              asset: r.asset,
              onChainHot: r.onChainHot,
              onChainCold: r.onChainCold,
              userLiabilities: r.userLiabilities,
              difference: r.difference,
              coverageRatio: r.coverageRatio,
              priceUSD: r.priceUSD,
              status: r.status,
              createdBy: ctx.payload.id,
            },
          })
        )
      );
      await logAdminAction(req, ctx.payload, { action: "RESERVE_SNAPSHOT", category: "finance", details: `${created.length} actifs capturés` });
      return NextResponse.json({ success: true, count: created.length });
    }

    if (action === "addLedgerEntry") {
      const entry = await prisma.ledgerEntry.create({
        data: {
          account: String(body.account || "MANUAL_ADJUSTMENT"),
          description: body.description || null,
          debit: Number(body.debit) || 0,
          credit: Number(body.credit) || 0,
          currency: body.currency || "USD",
          reference: body.reference || null,
          type: "MANUAL_ADJUSTMENT",
          createdBy: ctx.payload.id,
        },
      });
      await logAdminAction(req, ctx.payload, { action: "LEDGER_ADJUSTMENT", category: "finance", details: `${entry.account} D:${entry.debit} C:${entry.credit}` });
      return NextResponse.json({ success: true, entry });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    console.error("RESERVES_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
