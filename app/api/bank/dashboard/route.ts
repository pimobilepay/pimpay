import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Helper to check if user has bank admin access
async function checkBankAccess(req: NextRequest) {
  const session = await verifyAuth(req);
  if (!session) {
    return { error: "Non autorise", status: 401 };
  }
  if (session.role !== "BANK_ADMIN" && session.role !== "ADMIN") {
    return { error: "Acces refuse. Portail reserve aux administrateurs de la Banque.", status: 403 };
  }
  return { session };
}

export async function GET(req: NextRequest) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
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
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get total deposits (sum of all wallets)
    const walletsAggregation = await prisma.wallet.aggregate({
      _sum: {
        balance: true,
      },
    });

    // Get user statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        status: "ACTIVE",
      },
    });

    // Get pending KYC verifications
    const pendingKyc = await prisma.user.count({
      where: {
        kycStatus: "PENDING",
      },
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get transaction volume
    const transactionVolume = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: "SUCCESS",
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get KYC pending list
    const kycPendingList = await prisma.user.findMany({
      where: {
        kycStatus: "PENDING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get businesses count
    const businessCount = await prisma.business.count();

    // Get recent system alerts (from audit logs)
    const recentAlerts = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ["SUSPICIOUS_LOGIN", "HIGH_VALUE_TRANSACTION", "KYC_FLAGGED", "SYSTEM_ALERT"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return NextResponse.json({
      stats: {
        totalDeposits: walletsAggregation._sum.balance || 0,
        availableReserves: (walletsAggregation._sum.balance || 0) * 0.45, // 45% reserve ratio
        totalUsers,
        activeUsers,
        pendingKyc,
        businessCount,
        transactionVolume: transactionVolume._sum?.amount || 0,
        transactionCount: transactionVolume._count || 0,
      },
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        sender: tx.fromUser?.name || "Externe",
        receiver: tx.toUser?.name || "Externe",
        createdAt: tx.createdAt,
      })),
      kycPendingList: kycPendingList.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.role === "BUSINESS_ADMIN" ? "Entreprise" : "Particulier",
        submitted: user.createdAt,
      })),
      recentAlerts,
      period,
    });
  } catch (error) {
    console.error("Bank dashboard error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
