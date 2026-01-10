export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth"; // Utilisation de adminAuth pour la cohérence

export async function GET(req: NextRequest) {
  try {
    // 1. Vérification Admin
    // On ajoute 'await' et le double cast pour satisfaire le compilateur
    const payload = (await adminAuth(req)) as unknown as { id: string; role: string } | null;
    
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Collecte des données en parallèle
    const [newUsers, transactions, totalFees] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: last24h } }
      }),
      prisma.transaction.findMany({
        where: { createdAt: { gte: last24h }, status: "COMPLETED" }, // "COMPLETED" est souvent utilisé à la place de "SUCCESS"
        select: { amount: true, fee: true }
      }),
      prisma.wallet.aggregate({
        _sum: { balance: true },
        where: { currency: "PI" }
      })
    ]);

    // 3. Calculs des métriques
    const volume24h = transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    const fees24h = transactions.reduce((acc, tx) => acc + (tx.fee || 0), 0);
    const txCount = transactions.length;

    const report = {
      generatedAt: now.toISOString(),
      period: "Dernières 24 heures",
      metrics: {
        newUsers,
        transactionCount: txCount,
        volumePi: volume24h.toFixed(4),
        feesCollected: fees24h.toFixed(4),
        systemTotalLiquidity: totalFees._sum.balance?.toFixed(2) || "0"
      },
      status: "HEALTHY"
    };

    // 4. Log de la génération du rapport
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: "SYSTEM",
        action: "GENERATE_REPORT",
        details: `Rapport généré : ${txCount} transactions, ${newUsers} nouveaux membres.`
      }
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("REPORT_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du calcul du rapport" }, { status: 500 });
  }
}
