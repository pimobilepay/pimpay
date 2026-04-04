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
  return { session };
}

// Calculate credit score based on various factors
function calculateCreditScore(factors: {
  paymentHistory: number; // 0-100
  debtRatio: number; // 0-1
  accountAge: number; // in months
  transactionVolume: number;
  loanDefaults: number;
  kycVerified: boolean;
}): { score: number; riskLevel: string } {
  let score = 300; // Base score

  // Payment history (35% weight, max 245 points)
  score += Math.floor(factors.paymentHistory * 2.45);

  // Credit utilization / Debt ratio (30% weight, max 210 points)
  const utilizationScore = Math.max(0, 1 - factors.debtRatio) * 210;
  score += Math.floor(utilizationScore);

  // Account age (15% weight, max 105 points)
  const ageScore = Math.min(factors.accountAge / 60, 1) * 105; // Max at 5 years
  score += Math.floor(ageScore);

  // Transaction volume (10% weight, max 70 points)
  const volumeScore = Math.min(factors.transactionVolume / 100000, 1) * 70;
  score += Math.floor(volumeScore);

  // Loan defaults penalty (-50 per default)
  score -= factors.loanDefaults * 50;

  // KYC bonus (20 points)
  if (factors.kycVerified) {
    score += 20;
  }

  // Cap score between 300 and 850
  score = Math.max(300, Math.min(850, score));

  // Determine risk level
  let riskLevel: string;
  if (score >= 750) riskLevel = "LOW";
  else if (score >= 650) riskLevel = "MEDIUM";
  else if (score >= 500) riskLevel = "HIGH";
  else riskLevel = "VERY_HIGH";

  return { score, riskLevel };
}

// GET - Get credit scores with filters
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const riskLevel = searchParams.get("riskLevel") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // If specific user requested
    if (userId) {
      const creditScore = await prisma.creditScore.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              kycStatus: true,
              createdAt: true,
            },
          },
        },
      });

      if (!creditScore) {
        // Calculate score for user
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            loans: {
              select: { status: true, totalPaid: true, remainingBalance: true },
            },
            wallets: {
              select: { balance: true },
            },
            _count: {
              select: { sentTransactions: true },
            },
          },
        });

        if (!user) {
          return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
        }

        // Calculate factors
        const accountAge = Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const totalBalance = user.wallets.reduce((sum, w) => sum + w.balance, 0);
        const loanDefaults = user.loans.filter((l) => l.status === "DEFAULTED").length;
        const paidLoans = user.loans.filter((l) => l.status === "COMPLETED").length;
        const totalLoans = user.loans.length;
        const paymentHistory = totalLoans > 0 ? (paidLoans / totalLoans) * 100 : 80;
        const totalDebt = user.loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
        const debtRatio = totalBalance > 0 ? totalDebt / (totalBalance + totalDebt) : 0.5;

        const { score, riskLevel } = calculateCreditScore({
          paymentHistory,
          debtRatio,
          accountAge,
          transactionVolume: user._count.sentTransactions * 1000,
          loanDefaults,
          kycVerified: user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED",
        });

        return NextResponse.json({
          creditScore: {
            userId: user.id,
            score,
            riskLevel,
            factors: {
              paymentHistory,
              debtRatio,
              accountAge,
              transactionVolume: user._count.sentTransactions,
              loanDefaults,
            },
            user: {
              name: user.name || user.username,
              email: user.email,
              kycStatus: user.kycStatus,
            },
          },
        });
      }

      return NextResponse.json({ creditScore });
    }

    // List all credit scores
    const where: any = {};
    if (riskLevel !== "all") {
      where.riskLevel = riskLevel;
    }

    const [scores, total, riskStats] = await Promise.all([
      prisma.creditScore.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              kycStatus: true,
            },
          },
        },
        orderBy: { score: "desc" },
        skip,
        take: limit,
      }),
      prisma.creditScore.count({ where }),
      prisma.creditScore.groupBy({
        by: ["riskLevel"],
        _count: true,
        _avg: { score: true },
      }),
    ]);

    return NextResponse.json({
      creditScores: scores.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name || s.user.username || "N/A",
        userEmail: s.user.email || "N/A",
        score: s.score,
        riskLevel: s.riskLevel,
        factors: s.factors,
        lastCalculatedAt: s.lastCalculatedAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        byRiskLevel: riskStats.reduce(
          (acc, r) => ({
            ...acc,
            [r.riskLevel]: { count: r._count, avgScore: Math.round(r._avg.score || 0) },
          }),
          {}
        ),
      },
    });
  } catch (error) {
    console.error("Credit score error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Calculate and save credit score for a user
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { userId, recalculate } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        loans: {
          select: { status: true, totalPaid: true, remainingBalance: true },
        },
        wallets: {
          select: { balance: true },
        },
        _count: {
          select: { sentTransactions: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Calculate factors
    const accountAge = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const totalBalance = user.wallets.reduce((sum, w) => sum + w.balance, 0);
    const loanDefaults = user.loans.filter((l) => l.status === "DEFAULTED").length;
    const paidLoans = user.loans.filter((l) => l.status === "COMPLETED").length;
    const totalLoans = user.loans.length;
    const paymentHistory = totalLoans > 0 ? (paidLoans / totalLoans) * 100 : 80;
    const totalDebt = user.loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
    const debtRatio = totalBalance > 0 ? totalDebt / (totalBalance + totalDebt) : 0.5;

    const factors = {
      paymentHistory,
      debtRatio,
      accountAge,
      transactionVolume: user._count.sentTransactions * 1000,
      loanDefaults,
      kycVerified: user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED",
    };

    const { score, riskLevel } = calculateCreditScore(factors);

    // Upsert credit score
    const creditScore = await prisma.creditScore.upsert({
      where: { userId },
      update: {
        score,
        riskLevel: riskLevel as any,
        factors: factors as any,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId,
        score,
        riskLevel: riskLevel as any,
        factors: factors as any,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREDIT_SCORE_CALCULATED",
        adminId: access.session.id,
        targetId: userId,
        targetEmail: user.email,
        details: `Credit score calculated: ${score} (${riskLevel})`,
      },
    });

    return NextResponse.json({
      message: "Score de credit calcule",
      creditScore: {
        userId,
        score,
        riskLevel,
        factors,
      },
    });
  } catch (error) {
    console.error("Calculate credit score error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Manually adjust credit score
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { userId, adjustment, reason } = body;

    if (!userId || typeof adjustment !== "number") {
      return NextResponse.json({ error: "userId et adjustment requis" }, { status: 400 });
    }

    const creditScore = await prisma.creditScore.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });

    if (!creditScore) {
      return NextResponse.json({ error: "Score de credit non trouve" }, { status: 404 });
    }

    const newScore = Math.max(300, Math.min(850, creditScore.score + adjustment));
    let newRiskLevel: string;
    if (newScore >= 750) newRiskLevel = "LOW";
    else if (newScore >= 650) newRiskLevel = "MEDIUM";
    else if (newScore >= 500) newRiskLevel = "HIGH";
    else newRiskLevel = "VERY_HIGH";

    const updated = await prisma.creditScore.update({
      where: { userId },
      data: {
        score: newScore,
        riskLevel: newRiskLevel as any,
        lastCalculatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREDIT_SCORE_ADJUSTED",
        adminId: access.session.id,
        targetId: userId,
        targetEmail: creditScore.user.email,
        details: `Credit score adjusted by ${adjustment} (${creditScore.score} -> ${newScore}). Reason: ${reason || "Not specified"}`,
      },
    });

    return NextResponse.json({
      message: "Score de credit ajuste",
      creditScore: {
        userId,
        previousScore: creditScore.score,
        newScore,
        adjustment,
        riskLevel: newRiskLevel,
      },
    });
  } catch (error) {
    console.error("Adjust credit score error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
