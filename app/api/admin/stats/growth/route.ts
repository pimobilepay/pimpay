export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: Request) {
  try {
    // 1. VERIFICATION AUTHENTIFICATION
    const payload = adminAuth(req as any);
    
    // Si adminAuth renvoie une réponse (souvent une erreur 401), on la retourne immédiatement
    if (payload instanceof NextResponse) {
      console.log("Auth Failed: Payload is NextResponse (401/403)");
      return payload;
    }

    // 2. LOGIQUE DE RÉCUPÉRATION DES DONNÉES
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userGrowth = await prisma.user.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // 3. GROUPAGE DES DONNÉES PAR JOUR
    // On initialise les 7 derniers jours avec 0 pour éviter les trous dans le graphique
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days[d.toISOString().split('T')[0]] = 0;
    }

    userGrowth.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      if (last7Days[date] !== undefined) {
        last7Days[date]++;
      }
    });

    const chartData = Object.keys(last7Days).map(date => ({
      date,
      count: last7Days[date]
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur Stats API:", error);
    return NextResponse.json({ error: "Erreur serveur stats" }, { status: 500 });
  }
}
