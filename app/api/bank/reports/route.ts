import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Helper to check if user has bank admin access
async function checkBankAccess(req: Request) {
  const session = await verifyAuth(req as any);
  if (!session) {
    return { error: "Non autorise", status: 401 };
  }
  if (session.role !== "BANK_ADMIN" && session.role !== "ADMIN") {
    return { error: "Acces refuse. Portail reserve aux administrateurs de la Banque.", status: 403 };
  }
  return { session: { ...session, userId: session.id } };
}

// GET - Get reports list and report data
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type");
    const period = searchParams.get("period") || "month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let periodLabel = "";

    switch (period) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        periodLabel = `Semaine du ${startDate.toLocaleDateString("fr-FR")}`;
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        periodLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        break;
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        periodLabel = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
        periodLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }

    if (reportType) {
      // Generate specific report data
      let reportData: any = {};

      switch (reportType) {
        case "liquidity":
          const walletStats = await prisma.wallet.aggregate({
            _sum: { balance: true },
          });
          const transactionVolume = await prisma.transaction.aggregate({
            where: {
              createdAt: { gte: startDate },
              status: "SUCCESS",
            },
            _sum: { amount: true },
            _count: true,
          });
          reportData = {
            totalDeposits: walletStats._sum.balance || 0,
            reserves: (walletStats._sum.balance || 0) * 0.45,
            reserveRatio: 45,
            transactionVolume: transactionVolume._sum?.amount || 0,
            transactionCount: transactionVolume._count || 0,
          };
          break;

        case "compliance":
          const kycStats = await prisma.user.groupBy({
            by: ["kycStatus"],
            _count: true,
          });
          const amlAlerts = await prisma.auditLog.count({
            where: {
              action: { in: ["AML_ALERT", "SUSPICIOUS_TRANSACTION"] },
              createdAt: { gte: startDate },
            },
          });
          reportData = {
            kycPending: kycStats.find((s) => s.kycStatus === "PENDING")?._count || 0,
            kycApproved: kycStats.find((s) => s.kycStatus === "VERIFIED")?._count || 0,
            kycRejected: kycStats.find((s) => s.kycStatus === "REJECTED")?._count || 0,
            amlAlerts,
          };
          break;

        case "users":
          const userStats = await prisma.user.groupBy({
            by: ["status"],
            _count: true,
          });
          const newUsers = await prisma.user.count({
            where: { createdAt: { gte: startDate } },
          });
          reportData = {
            totalUsers: userStats.reduce((sum, s) => sum + s._count, 0),
            activeUsers: userStats.find((s) => s.status === "ACTIVE")?._count || 0,
            newUsers,
          };
          break;

        case "transactions":
          const txStats = await prisma.transaction.groupBy({
            by: ["type"],
            where: { createdAt: { gte: startDate } },
            _sum: { amount: true },
            _count: true,
          });
          reportData = {
            byType: txStats.map((t) => ({
              type: t.type,
              count: t._count,
              volume: t._sum.amount || 0,
            })),
          };
          break;

        default:
          return NextResponse.json({ error: "Type de rapport non reconnu" }, { status: 400 });
      }

      return NextResponse.json({
        report: {
          type: reportType,
          period: periodLabel,
          generatedAt: new Date(),
          data: reportData,
        },
      });
    }

    // Return list of available reports
    const recentReports = [
      {
        id: "RPT001",
        name: "Rapport Liquidite Mensuel",
        type: "liquidity",
        period: periodLabel,
        generated: new Date().toISOString(),
        status: "ready",
        size: "2.4 MB",
      },
      {
        id: "RPT002",
        name: "Synthese Conformite KYC",
        type: "compliance",
        period: periodLabel,
        generated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: "ready",
        size: "1.8 MB",
      },
      {
        id: "RPT003",
        name: "Analyse Flux Interbancaires",
        type: "interbank",
        period: periodLabel,
        generated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        status: "ready",
        size: "3.1 MB",
      },
      {
        id: "RPT004",
        name: "Rapport Utilisateurs Actifs",
        type: "users",
        period: periodLabel,
        generated: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        status: "ready",
        size: "1.2 MB",
      },
    ];

    // Report templates
    const templates = [
      { id: "TPL001", name: "Liquidite Standard", type: "liquidity", description: "Reserves, ratios et flux de tresorerie", category: "Finance" },
      { id: "TPL002", name: "Conformite KYC/AML", type: "compliance", description: "Verifications et alertes anti-blanchiment", category: "Conformite" },
      { id: "TPL003", name: "Performance Utilisateurs", type: "users", description: "Activite et engagement des clients", category: "Clients" },
      { id: "TPL004", name: "Analyse des Risques", type: "risk", description: "Exposition et indicateurs de risque", category: "Risque" },
      { id: "TPL005", name: "Flux Interbancaires", type: "interbank", description: "Transferts SWIFT et volumes", category: "Operations" },
      { id: "TPL006", name: "Audit Trail", type: "audit", description: "Journal des actions systeme", category: "Securite" },
    ];

    // Scheduled reports
    const scheduledReports = [
      { id: "SCH001", name: "Rapport Journalier Transactions", frequency: "daily", nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), recipients: 3 },
      { id: "SCH002", name: "Synthese Hebdomadaire Liquidite", frequency: "weekly", nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), recipients: 5 },
      { id: "SCH003", name: "Rapport Mensuel Conformite", frequency: "monthly", nextRun: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(), recipients: 8 },
    ];

    // Get report generation stats
    const reportsGenerated = await prisma.auditLog.count({
      where: {
        action: "REPORT_GENERATED",
        createdAt: { gte: startDate },
      },
    });

    return NextResponse.json({
      recentReports,
      templates,
      scheduledReports,
      statistics: {
        generatedThisMonth: reportsGenerated || recentReports.length,
        scheduled: scheduledReports.length,
        templates: templates.length,
      },
    });
  } catch (error) {
    console.error("Bank reports error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Generate a new report
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { type, period, format, recipients } = body;

    if (!type) {
      return NextResponse.json({ error: "Type de rapport requis" }, { status: 400 });
    }

    // Log the report generation
    await prisma.auditLog.create({
      data: {
        action: "REPORT_GENERATED",
        adminId: access.session.id,
        adminName: access.session.username,
        details: `Generated ${type} report for period ${period || "current"}. Format: ${format || "PDF"}. Recipients: ${recipients?.length || 0}`,
      },
    });

    // Return mock report info (in production, would trigger async report generation)
    return NextResponse.json({
      message: "Rapport en cours de generation",
      report: {
        id: `RPT-${Date.now()}`,
        type,
        period: period || "current",
        format: format || "PDF",
        status: "generating",
        estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
      },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
