export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";                
import { adminAuth } from "@/lib/adminAuth"; // Utilisation de adminAuth pour correspondre à ton import réel

export async function GET(req: NextRequest) {
  try {
    // 1. VERIFICATION ADMIN
    // Correction : ajout de await et cast as unknown pour le build
    const payload = (await adminAuth(req)) as unknown as { id: string; role: string } | null;

    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }                                                 

    // 2. RÉCUPÉRATION DES POINTS DE DONNÉES DEPUIS DAILY_STATS
    // On prend les 30 derniers jours pour avoir un graphique plus riche
    const statsHistory = await prisma.dailyStats.findMany({
      take: 30,
      orderBy: {
        date: 'asc',
      },
    });

    // 3. FORMATAGE POUR RECHARTS
    const chartData = statsHistory.map((stat) => ({
      date: stat.date.toISOString().split('T')[0],
      totalUsers: stat.totalUsers,
      consensusPrice: stat.consensusPrice,
      totalVolume: stat.totalVolume,
      activeUsers: stat.activeUsers
    }));

    // 4. FALLBACK : Si la table est vide
    if (chartData.length === 0) {
      return NextResponse.json([{
        date: new Date().toISOString().split('T')[0],
        totalUsers: 0,
        consensusPrice: 0,
        totalVolume: 0,
        activeUsers: 0
      }]);
    }

    return NextResponse.json(chartData);

  } catch (error) {
    console.error("STATS_API_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
