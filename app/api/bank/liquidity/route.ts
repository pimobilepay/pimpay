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

export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get total balances by currency
    const walletsByCurrency = await prisma.wallet.groupBy({
      by: ["currency"],
      _sum: {
        balance: true,
      },
    });

    // Calculate total reserves and deposits
    const totalDeposits = walletsByCurrency.reduce((sum, w) => sum + (w._sum.balance || 0), 0);
    const reserveRatio = 0.45; // 45% reserve ratio
    const totalReserves = totalDeposits * reserveRatio;

    // Get inflows (deposits) in last 24h
    const inflows24h = await prisma.transaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "SUCCESS",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get outflows (withdrawals) in last 24h
    const outflows24h = await prisma.transaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "SUCCESS",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get daily transaction volumes for trend chart
    const dailyVolumes = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as withdrawals
      FROM transactions
      WHERE created_at >= ${startDate}
        AND status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    ` as any[];

    // Get recent liquidity movements
    const recentMovements = await prisma.transaction.findMany({
      where: {
        type: {
          in: ["DEPOSIT", "WITHDRAWAL", "TRANSFER"],
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        fromUser: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Calculate reserve requirements by currency
    const reserveRequirements = walletsByCurrency.map((w) => {
      const total = w._sum.balance || 0;
      const required = total * 0.15; // 15% minimum reserve requirement
      const actual = total * 0.20; // Assume 20% actual reserves
      return {
        currency: w.currency,
        required,
        actual,
        status: actual >= required ? "compliant" : "warning",
      };
    });

    // Asset distribution for pie chart
    const assetDistribution = walletsByCurrency.map((w) => ({
      name: w.currency,
      value: w._sum.balance || 0,
      percentage: totalDeposits > 0 ? ((w._sum.balance || 0) / totalDeposits) * 100 : 0,
    }));

    return NextResponse.json({
      overview: {
        totalReserves,
        totalDeposits,
        reserveRatio: reserveRatio * 100,
        inflows24h: {
          amount: inflows24h._sum?.amount || 0,
          count: inflows24h._count || 0,
        },
        outflows24h: {
          amount: outflows24h._sum?.amount || 0,
          count: outflows24h._count || 0,
        },
        netFlow24h: (inflows24h._sum?.amount || 0) - (outflows24h._sum?.amount || 0),
      },
      trend: dailyVolumes.map((d: any) => ({
        date: d.date,
        deposits: Number(d.deposits) || 0,
        withdrawals: Number(d.withdrawals) || 0,
      })),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        type: m.type === "DEPOSIT" ? "inflow" : "outflow",
        source: m.type === "DEPOSIT" ? "Depot Client" : m.type === "WITHDRAWAL" ? "Retrait" : "Transfert",
        amount: m.amount,
        currency: m.currency,
        date: m.createdAt,
        status: m.status.toLowerCase(),
        senderName: m.fromUser?.name,
      })),
      reserveRequirements,
      assetDistribution,
      period,
    });
  } catch (error) {
    console.error("Bank liquidity error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create liquidity adjustment
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { type, amount, currency, reason } = body;

    if (!type || !amount || !currency) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Log the liquidity adjustment
    await prisma.auditLog.create({
      data: {
        action: `LIQUIDITY_${type.toUpperCase()}`,
        adminId: access.session.userId,
        details: `${type} of ${amount} ${currency}. Reason: ${reason || "N/A"}`,
      },
    });

    return NextResponse.json({
      message: "Ajustement de liquidite enregistre",
      adjustment: {
        type,
        amount,
        currency,
        reason,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Liquidity adjustment error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
