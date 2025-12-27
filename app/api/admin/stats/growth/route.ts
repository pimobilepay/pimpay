export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth"; // Utilisation de verifyAuth pour la cohérence avec tes autres fichiers

export async function GET(req: NextRequest) {
  try {
    // 1. VERIFICATION ADMIN
    const payload = verifyAuth(req) as { role: string } | null;
    
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
    // On transforme les données pour qu'elles correspondent aux clés attendues par ton composant
    const chartData = statsHistory.map((stat) => ({
      date: stat.date.toISOString().split('T')[0],
      totalUsers: stat.totalUsers,
      consensusPrice: stat.consensusPrice,
      totalVolume: stat.totalVolume,
      activeUsers: stat.activeUsers
    }));

    // 4. FALLBACK : Si la table est vide (première utilisation)
    if (chartData.length === 0) {
      // Génère un point fictif pour éviter que le graphique ne crash
      return NextResponse.json([{
        date: new Date().toISOString().split('T')[0],
        totalUsers: 0,
        consensusPrice: 0
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
