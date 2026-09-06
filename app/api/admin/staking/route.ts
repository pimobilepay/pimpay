import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth || auth instanceof NextResponse) {
    return auth || NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source") || "platform";
  if (source === "ecosystem") {
    const url = process.env.PI_STAKING_API_URL;
    const apiKey = process.env.PI_STAKING_API_KEY || process.env.PI_API_KEY;
    if (!url || !apiKey) {
      return NextResponse.json({ configured: false, whitelistRequired: true, positions: [], totals: null });
    }
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        return NextResponse.json({ configured: true, whitelistRequired: response.status === 401 || response.status === 403, positions: [], totals: null, error: `Pi API indisponible (${response.status})` }, { status: response.status === 401 || response.status === 403 ? 403 : 502 });
      }
      const payload = await response.json();
      const positions = Array.isArray(payload) ? payload : payload.positions || payload.data || [];
      return NextResponse.json({ configured: true, whitelistRequired: false, positions, totals: payload.totals || null });
    } catch {
      return NextResponse.json({ configured: true, whitelistRequired: false, positions: [], totals: null, error: "Impossible de joindre l’API Pi" }, { status: 502 });
    }
  }

  const [positions, aggregate, users] = await Promise.all([
    prisma.staking.findMany({
      where: { isActive: true },
      select: { id: true, amount: true, apy: true, currency: true, startDate: true, endDate: true, rewardsEarned: true, user: { select: { id: true, username: true, name: true, email: true } } },
      orderBy: { startDate: "desc" }, take: 500,
    }),
    prisma.staking.aggregate({ where: { isActive: true }, _sum: { amount: true, rewardsEarned: true }, _count: { _all: true } }),
    prisma.staking.groupBy({ by: ["currency"], where: { isActive: true }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return NextResponse.json({ configured: true, positions, totals: { amount: aggregate._sum.amount || 0, rewards: aggregate._sum.rewardsEarned || 0, positions: aggregate._count._all, byCurrency: users } });
}
