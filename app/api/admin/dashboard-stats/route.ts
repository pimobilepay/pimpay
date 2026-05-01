import { requireAdmin } from "@/lib/requireAdmin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // 1. STATISTIQUES GLOBALES — 3 requêtes en parallèle (safe avec pool=5)
    const [totalUsers, pendingKyc, totalWallets] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
      prisma.wallet.aggregate({
        _sum: { balance: true },
        where: { currency: "XAF" }
      })
    ]);

    // 2. ACTIVITÉS RÉCENTES
    const recentTransactions = await prisma.transaction.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { firstName: true, lastName: true } },
        toUser: { select: { firstName: true, lastName: true } }
      }
    });

    const formattedActivities = recentTransactions.map(tx => ({
      userName: tx.type === "DEPOSIT" ? tx.toUser?.firstName : tx.fromUser?.firstName || "Système",
      label: tx.type.replace("_", " "),
      amount: `${tx.amount.toLocaleString()} ${tx.currency}`,
      time: formatTime(tx.createdAt),
      type: tx.type === "DEPOSIT" ? "depot" : "retrait"
    }));

    // 3. DONNÉES DU GRAPHIQUE — UNE seule requête groupBy au lieu de 7 requêtes séquentielles
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

    const chartRaw = await prisma.transaction.groupBy({
      by: ['type', 'createdAt'],
      _sum: { amount: true },
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: { in: ["SUCCESS"] }
      },
    });

    // Construire les 7 jours à partir des données brutes
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        dayStart: startOfDay(date).getTime(),
        name: format(date, "eee"),
      };
    });

    const chartHistory = last7Days.map(day => {
      const dayEnd = day.dayStart + 24 * 60 * 60 * 1000;
      const dayRows = chartRaw.filter(r => {
        const t = new Date(r.createdAt).getTime();
        return t >= day.dayStart && t < dayEnd;
      });
      const entrees = dayRows
        .filter(r => r.type === "DEPOSIT")
        .reduce((sum, r) => sum + (r._sum.amount || 0), 0);
      const sorties = dayRows
        .filter(r => r.type === "WITHDRAW" || r.type === "TRANSFER")
        .reduce((sum, r) => sum + (r._sum.amount || 0), 0);
      return { name: day.name, entrees, sorties };
    });

    return NextResponse.json({
      stats: {
        totalVolume: totalWallets._sum.balance || 0,
        totalUsers,
        pendingKyc,
      },
      recentActivities: formattedActivities,
      history: chartHistory
    });

  } catch (error) {
    console.error("[DASHBOARD_STATS_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors du calcul des stats" }, { status: 500 });
  }
}

function formatTime(date: Date) {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
  if (diff < 1) return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  return `Il y a ${Math.floor(diff / 60)}h`;
}
