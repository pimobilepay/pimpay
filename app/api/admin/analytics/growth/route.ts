import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type Period = "24h" | "7d" | "30d" | "90d" | "all";
type BucketUnit = "hour" | "day" | "week" | "month";

// Whitelisted config per period. `durationMs` is used to derive the previous
// comparison window; `unit` controls how the time-series chart is bucketed.
const PERIOD_CONFIG: Record<Period, { durationMs: number | null; unit: BucketUnit }> = {
  "24h": { durationMs: 24 * 60 * 60 * 1000, unit: "hour" },
  "7d": { durationMs: 7 * 24 * 60 * 60 * 1000, unit: "day" },
  "30d": { durationMs: 30 * 24 * 60 * 60 * 1000, unit: "day" },
  "90d": { durationMs: 90 * 24 * 60 * 60 * 1000, unit: "week" },
  "all": { durationMs: null, unit: "month" },
};

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function growthPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// Advance a date by one bucket unit (used to fill gaps in the series).
function stepDate(d: Date, unit: BucketUnit): Date {
  const n = new Date(d);
  if (unit === "hour") n.setHours(n.getHours() + 1);
  else if (unit === "day") n.setDate(n.getDate() + 1);
  else if (unit === "week") n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

// Truncate a date to the start of its bucket, matching Postgres date_trunc.
function truncDate(d: Date, unit: BucketUnit): Date {
  const n = new Date(d);
  if (unit === "hour") { n.setMinutes(0, 0, 0); }
  else if (unit === "day") { n.setHours(0, 0, 0, 0); }
  else if (unit === "week") {
    n.setHours(0, 0, 0, 0);
    const day = (n.getDay() + 6) % 7; // Monday-based, like Postgres
    n.setDate(n.getDate() - day);
  } else { n.setHours(0, 0, 0, 0); n.setDate(1); }
  return n;
}

function bucketLabel(d: Date, unit: BucketUnit): string {
  if (unit === "hour") return `${String(d.getHours()).padStart(2, "0")}h`;
  if (unit === "month") return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export async function GET(req: NextRequest) {
  const adminPayload = await adminAuth(req);
  if (!adminPayload) return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const periodParam = (url.searchParams.get("period") || "30d") as Period;
    const period: Period = PERIOD_CONFIG[periodParam] ? periodParam : "30d";
    const { durationMs, unit } = PERIOD_CONFIG[period];

    const now = new Date();

    // Resolve the window start. For "all" we anchor on the very first user.
    let start: Date;
    if (durationMs === null) {
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      start = firstUser ? truncDate(firstUser.createdAt, unit) : truncDate(now, unit);
    } else {
      start = new Date(now.getTime() - durationMs);
    }

    // Previous comparison window (skipped for "all").
    const prevStart = durationMs !== null ? new Date(start.getTime() - durationMs) : null;
    const prevEnd = start;

    // --- Aggregate metrics (current + previous windows) ---
    const [
      newUsers, txCount, txAgg,
      prevNewUsers, prevTxCount, prevTxAgg,
      totalUsers,
      userBuckets, txBuckets,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lte: now } } }),
      prisma.transaction.count({ where: { createdAt: { gte: start, lte: now } } }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: start, lte: now } },
        _sum: { amount: true, fee: true },
      }),

      prevStart
        ? prisma.user.count({ where: { createdAt: { gte: prevStart, lt: prevEnd } } })
        : Promise.resolve(0),
      prevStart
        ? prisma.transaction.count({ where: { createdAt: { gte: prevStart, lt: prevEnd } } })
        : Promise.resolve(0),
      prevStart
        ? prisma.transaction.aggregate({
            where: { createdAt: { gte: prevStart, lt: prevEnd } },
            _sum: { amount: true, fee: true },
          })
        : Promise.resolve({ _sum: { amount: 0, fee: 0 } } as { _sum: { amount: number | null; fee: number | null } }),

      // Cumulative user base at the end of the window.
      prisma.user.count({ where: { createdAt: { lte: now } } }),

      // Time-series buckets. `unit` is whitelisted so it is safe to inline.
      prisma.$queryRawUnsafe(
        `SELECT date_trunc('${unit}', "createdAt") as bucket, COUNT(*)::int as count
         FROM "User"
         WHERE "createdAt" >= $1 AND "createdAt" <= $2
         GROUP BY bucket ORDER BY bucket ASC`,
        start, now,
      ) as Promise<{ bucket: Date; count: number }[]>,
      prisma.$queryRawUnsafe(
        `SELECT date_trunc('${unit}', "createdAt") as bucket, COUNT(*)::int as count,
                COALESCE(SUM(amount), 0)::float as volume, COALESCE(SUM(fee), 0)::float as fees
         FROM "Transaction"
         WHERE "createdAt" >= $1 AND "createdAt" <= $2
         GROUP BY bucket ORDER BY bucket ASC`,
        start, now,
      ) as Promise<{ bucket: Date; count: number; volume: number; fees: number }[]>,
    ]);

    const volume = round2(txAgg._sum.amount || 0);
    const fees = round2(txAgg._sum.fee || 0);
    const prevVolume = round2(prevTxAgg._sum.amount || 0);
    const prevFees = round2(prevTxAgg._sum.fee || 0);

    // --- Build the filled time-series ---
    const userMap = new Map<string, number>();
    userBuckets.forEach((r) => userMap.set(new Date(r.bucket).toISOString(), r.count));
    const txMap = new Map<string, { count: number; volume: number; fees: number }>();
    txBuckets.forEach((r) =>
      txMap.set(new Date(r.bucket).toISOString(), { count: r.count, volume: r.volume, fees: r.fees }),
    );

    const chart: Array<{
      label: string; newUsers: number; transactions: number; volume: number; fees: number;
    }> = [];
    let cursor = truncDate(start, unit);
    const guardEnd = truncDate(now, unit);
    let safety = 0;
    while (cursor <= guardEnd && safety < 500) {
      const key = cursor.toISOString();
      const tx = txMap.get(key);
      chart.push({
        label: bucketLabel(cursor, unit),
        newUsers: userMap.get(key) || 0,
        transactions: tx?.count || 0,
        volume: round2(tx?.volume || 0),
        fees: round2(tx?.fees || 0),
      });
      cursor = stepDate(cursor, unit);
      safety++;
    }

    return NextResponse.json({
      period,
      unit,
      rangeStart: start.toISOString(),
      rangeEnd: now.toISOString(),
      hasComparison: prevStart !== null,
      totalUsers,
      metrics: {
        newUsers: { value: newUsers, previous: prevNewUsers, growth: prevStart ? growthPct(newUsers, prevNewUsers) : null },
        transactions: { value: txCount, previous: prevTxCount, growth: prevStart ? growthPct(txCount, prevTxCount) : null },
        volume: { value: volume, previous: prevVolume, growth: prevStart ? growthPct(volume, prevVolume) : null },
        fees: { value: fees, previous: prevFees, growth: prevStart ? growthPct(fees, prevFees) : null },
      },
      chart,
    });
  } catch (err) {
    console.error("[Growth API Error]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
