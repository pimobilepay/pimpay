import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";

export async function GET() {
  try {
    // 1. STATISTIQUES GLOBALES
    const [totalUsers, pendingKyc, totalWallets] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
      prisma.wallet.aggregate({
        _sum: { balance: true },
        where: { currency: "XAF" } // On se base sur la devise principale
      })
    ]);

    // 2. ACTIVITÉS RÉCENTES (Les 5 dernières transactions)
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

    // 3. DONNÉES DU GRAPHIQUE (7 derniers jours)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      return {
        start: startOfDay(date),
        name: format(date, "eee"), // Lun, Mar...
      };
    }).reverse();

    const chartHistory = await Promise.all(last7Days.map(async (day) => {
      const stats = await prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: day.start,
            lt: new Date(day.start.getTime() + 24 * 60 * 60 * 1000)
          },
          status: { in: ["SUCCESS", "SUCCESS"] }
        }
      });

      const entrees = stats.find(s => s.type === "DEPOSIT")?._sum.amount || 0;
      const sorties = stats.find(s => s.type === "WITHDRAW" || s.type === "TRANSFER")?._sum.amount || 0;

      return {
        name: day.name,
        entrees,
        sorties
      };
    }));

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

// Fonction utilitaire pour le temps
function formatTime(date: Date) {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
  if (diff < 1) return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  return `Il y a ${Math.floor(diff / 60)}h`;
}
