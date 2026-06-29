export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { getPiPrice } from "@/lib/fees";
import { toUsd, DEFAULT_CRYPTO_PRICES, FIAT_RATES } from "@/lib/exchange";

// GET — paires de swap, marges, liquidité
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.EXCHANGE_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const pairs = await prisma.exchangePair.findMany({ orderBy: [{ base: "asc" }, { quote: "asc" }] });

  const piPrice = await getPiPrice();
  const priceMap: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES, PI: piPrice };

  // Prix mid de référence + bid/ask dérivés des marges, et valeur de liquidité
  const rows = pairs.map((p) => {
    const ask = p.rate * (1 + (p.marginBps + p.spreadBps) / 10000);
    const bid = p.rate * (1 - (p.marginBps + p.spreadBps) / 10000);
    return {
      ...p,
      bid: Number(bid.toFixed(8)),
      ask: Number(ask.toFixed(8)),
      liquidityUSD: toUsd(p.base, p.liquidity, priceMap),
    };
  });

  const totalLiquidityUSD = rows.reduce((s, r) => s + r.liquidityUSD, 0);

  return NextResponse.json({
    pairs: rows,
    stats: {
      total: pairs.length,
      enabled: pairs.filter((p) => p.enabled).length,
      totalLiquidityUSD,
      avgMarginBps: pairs.length ? Math.round(pairs.reduce((s, p) => s + p.marginBps, 0) / pairs.length) : 0,
    },
  });
}

// POST — gestion des paires de change
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.EXCHANGE_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "upsertPair": {
        const base = String(body.base || "").toUpperCase();
        const quote = String(body.quote || "").toUpperCase();
        if (!base || !quote || base === quote) {
          return NextResponse.json({ error: "Paire invalide" }, { status: 400 });
        }
        const data = {
          rate: Number(body.rate) || 0,
          marginBps: Math.round(Number(body.marginBps)) || 0,
          spreadBps: Math.round(Number(body.spreadBps)) || 0,
          minAmount: Number(body.minAmount) || 0,
          maxAmount: Number(body.maxAmount) || 0,
          liquidity: Number(body.liquidity) || 0,
          source: body.source || "MANUAL",
          enabled: body.enabled !== false,
          updatedBy: ctx.payload.id,
        };
        const pair = await prisma.exchangePair.upsert({
          where: { base_quote: { base, quote } },
          create: { base, quote, ...data },
          update: data,
        });
        await logAdminAction(req, ctx.payload, {
          action: "EXCHANGE_UPSERT_PAIR", category: "exchange",
          details: `${base}/${quote} @ ${pair.rate} (${pair.marginBps}bps)`,
        });
        return NextResponse.json({ success: true, pair });
      }
      case "togglePair": {
        const pair = await prisma.exchangePair.update({
          where: { id: body.id },
          data: { enabled: !!body.enabled, updatedBy: ctx.payload.id },
        });
        await logAdminAction(req, ctx.payload, {
          action: "EXCHANGE_TOGGLE_PAIR", category: "exchange", details: `${pair.base}/${pair.quote} = ${pair.enabled}`,
        });
        return NextResponse.json({ success: true, pair });
      }
      case "setLiquidity": {
        const pair = await prisma.exchangePair.update({
          where: { id: body.id },
          data: { liquidity: Number(body.liquidity) || 0, updatedBy: ctx.payload.id },
        });
        await logAdminAction(req, ctx.payload, {
          action: "EXCHANGE_SET_LIQUIDITY", category: "exchange", details: `${pair.base}/${pair.quote} → ${pair.liquidity}`,
        });
        return NextResponse.json({ success: true, pair });
      }
      case "deletePair": {
        await prisma.exchangePair.delete({ where: { id: body.id } });
        await logAdminAction(req, ctx.payload, {
          action: "EXCHANGE_DELETE_PAIR", category: "exchange", details: body.id,
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("EXCHANGE_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
