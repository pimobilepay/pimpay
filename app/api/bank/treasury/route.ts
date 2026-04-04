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

// GET - Get treasury overview and financial metrics
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date filter
    const now = new Date();
    let dateFilter: Date;
    switch (period) {
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get aggregated financial data
    const [
      totalDeposits,
      totalWithdrawals,
      walletBalances,
      transactionVolume,
      loanStats,
      savingsStats,
      userStats,
      recentTransactions,
    ] = await Promise.all([
      // Total deposits in period
      prisma.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: "SUCCESS",
          createdAt: { gte: dateFilter },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total withdrawals in period
      prisma.transaction.aggregate({
        where: {
          type: "WITHDRAW",
          status: "SUCCESS",
          createdAt: { gte: dateFilter },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total wallet balances by currency
      prisma.wallet.groupBy({
        by: ["currency"],
        _sum: { balance: true, frozenBalance: true },
        _count: true,
      }),
      // Transaction volume by type
      prisma.transaction.groupBy({
        by: ["type"],
        where: {
          status: "SUCCESS",
          createdAt: { gte: dateFilter },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Loan portfolio
      prisma.loan.aggregate({
        where: { status: { in: ["ACTIVE", "APPROVED"] } },
        _sum: { amount: true, remainingBalance: true, totalPaid: true },
        _count: true,
      }),
      // Savings deposits
      prisma.savingsAccount.aggregate({
        where: { status: "ACTIVE" },
        _sum: { balance: true },
        _count: true,
        _avg: { interestRate: true },
      }),
      // User statistics
      prisma.user.groupBy({
        by: ["status"],
        _count: true,
      }),
      // Recent large transactions
      prisma.transaction.findMany({
        where: {
          amount: { gte: 100000 },
          createdAt: { gte: dateFilter },
        },
        orderBy: { amount: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          type: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate fees collected
    const feesCollected = await prisma.transaction.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: dateFilter },
        fee: { gt: 0 },
      },
      _sum: { fee: true },
    });

    // Calculate net position
    const totalAssets = walletBalances.reduce((sum, w) => sum + (w._sum.balance || 0), 0);
    const totalFrozen = walletBalances.reduce((sum, w) => sum + (w._sum.frozenBalance || 0), 0);
    const totalLoanPortfolio = loanStats._sum.remainingBalance || 0;
    const totalSavingsLiability = savingsStats._sum.balance || 0;

    // Daily transaction trends
    const dailyTrends = await prisma.transaction.groupBy({
      by: ["createdAt"],
      where: {
        status: "SUCCESS",
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      overview: {
        totalAssets,
        totalFrozen,
        availableLiquidity: totalAssets - totalFrozen,
        totalLoanPortfolio,
        totalSavingsDeposits: totalSavingsLiability,
        netPosition: totalAssets + totalLoanPortfolio - totalSavingsLiability,
        feesCollected: feesCollected._sum.fee || 0,
      },
      deposits: {
        total: totalDeposits._sum.amount || 0,
        count: totalDeposits._count || 0,
      },
      withdrawals: {
        total: totalWithdrawals._sum.amount || 0,
        count: totalWithdrawals._count || 0,
      },
      netFlow: (totalDeposits._sum.amount || 0) - (totalWithdrawals._sum.amount || 0),
      balancesByCurrency: walletBalances.map((w) => ({
        currency: w.currency,
        totalBalance: w._sum.balance || 0,
        frozenBalance: w._sum.frozenBalance || 0,
        accountCount: w._count,
      })),
      transactionVolume: transactionVolume.map((t) => ({
        type: t.type,
        volume: t._sum.amount || 0,
        count: t._count,
      })),
      loans: {
        activeLoans: loanStats._count || 0,
        totalDisbursed: loanStats._sum.amount || 0,
        totalOutstanding: loanStats._sum.remainingBalance || 0,
        totalCollected: loanStats._sum.totalPaid || 0,
      },
      savings: {
        activeAccounts: savingsStats._count || 0,
        totalDeposits: savingsStats._sum.balance || 0,
        avgInterestRate: savingsStats._avg.interestRate || 3.5,
      },
      userStats: userStats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {}
      ),
      recentLargeTransactions: recentTransactions,
      period,
    });
  } catch (error) {
    console.error("Treasury error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Record treasury adjustment or transfer
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { action, amount, currency, description, fromAccountId, toAccountId } = body;

    if (!action || !amount) {
      return NextResponse.json({ error: "Action et montant requis" }, { status: 400 });
    }

    let logDetails = "";

    switch (action) {
      case "interbank_transfer":
        // Record interbank transfer
        if (!fromAccountId || !toAccountId) {
          return NextResponse.json({ error: "Comptes source et destination requis" }, { status: 400 });
        }
        logDetails = `Interbank transfer: ${amount} ${currency || "XAF"} from ${fromAccountId} to ${toAccountId}`;
        break;

      case "capital_injection":
        // Record capital injection
        logDetails = `Capital injection: ${amount} ${currency || "XAF"}. ${description || ""}`;
        break;

      case "dividend_distribution":
        // Record dividend payout
        logDetails = `Dividend distribution: ${amount} ${currency || "XAF"}. ${description || ""}`;
        break;

      case "reserve_adjustment":
        // Adjust reserves
        logDetails = `Reserve adjustment: ${amount} ${currency || "XAF"}. ${description || ""}`;
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    // Log the treasury action
    await prisma.auditLog.create({
      data: {
        action: `TREASURY_${action.toUpperCase()}`,
        adminId: access.session.id,
        details: logDetails,
      },
    });

    // Create system log for compliance
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        source: "TREASURY",
        action: action.toUpperCase(),
        message: logDetails,
        details: { amount, currency, description },
        userId: access.session.id,
      },
    });

    return NextResponse.json({
      message: "Operation enregistree avec succes",
      action,
      amount,
      currency: currency || "XAF",
    });
  } catch (error) {
    console.error("Treasury action error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
