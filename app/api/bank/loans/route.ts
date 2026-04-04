import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { nanoid } from "nanoid";

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

// Calculate monthly payment using standard amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

// GET - List all loans with filters
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const tab = searchParams.get("tab") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { purpose: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status !== "all") {
      where.status = status;
    }

    if (type !== "all") {
      where.type = type;
    }

    // Tab filters
    if (tab === "pending") {
      where.status = { in: ["PENDING", "UNDER_REVIEW"] };
    } else if (tab === "active") {
      where.status = "ACTIVE";
    } else if (tab === "defaulted") {
      where.status = "DEFAULTED";
    }

    // Get loans with pagination
    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.loan.count({ where }),
    ]);

    // Get statistics
    const [statusStats, typeStats, totals] = await Promise.all([
      prisma.loan.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.loan.groupBy({
        by: ["type"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.loan.aggregate({
        _sum: {
          amount: true,
          totalPaid: true,
          remainingBalance: true,
        },
        _avg: {
          interestRate: true,
        },
      }),
    ]);

    // Calculate default rate
    const totalLoans = await prisma.loan.count();
    const defaultedLoans = await prisma.loan.count({ where: { status: "DEFAULTED" } });
    const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;

    return NextResponse.json({
      loans: loans.map((loan) => ({
        id: loan.id,
        reference: loan.reference,
        userId: loan.userId,
        userName: loan.user.name || loan.user.username || "N/A",
        userEmail: loan.user.email || "N/A",
        type: loan.type,
        amount: loan.amount,
        interestRate: loan.interestRate,
        term: loan.term,
        monthlyPayment: loan.monthlyPayment,
        totalPaid: loan.totalPaid,
        remainingBalance: loan.remainingBalance,
        status: loan.status,
        purpose: loan.purpose,
        collateral: loan.collateral,
        guarantor: loan.guarantorName,
        createdAt: loan.createdAt.toISOString(),
        approvedAt: loan.approvedAt?.toISOString(),
        nextPaymentDate: loan.nextPaymentDate?.toISOString(),
        missedPayments: loan.missedPayments,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalLoans,
        totalDisbursed: totals._sum.amount || 0,
        totalOutstanding: totals._sum.remainingBalance || 0,
        totalCollected: totals._sum.totalPaid || 0,
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
        byType: typeStats.reduce(
          (acc, t) => ({
            ...acc,
            [t.type]: { count: t._count, amount: t._sum.amount || 0 },
          }),
          {}
        ),
        defaultRate,
        avgInterestRate: totals._avg.interestRate || 12,
      },
    });
  } catch (error) {
    console.error("Bank loans error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new loan application
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const {
      userId,
      type,
      amount,
      interestRate,
      term,
      purpose,
      collateral,
      guarantorName,
      guarantorPhone,
      guarantorAddress,
    } = body;

    if (!userId || !amount || !term) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Calculate monthly payment
    const rate = interestRate || 12;
    const monthlyPayment = calculateMonthlyPayment(amount, rate, term);

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        reference: `LN-${Date.now()}-${nanoid(6).toUpperCase()}`,
        userId,
        type: type || "PERSONAL",
        amount,
        interestRate: rate,
        term,
        monthlyPayment,
        remainingBalance: amount + (amount * rate * term) / 1200, // Total with interest
        purpose,
        collateral,
        guarantorName,
        guarantorPhone,
        guarantorAddress,
        status: "PENDING",
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "LOAN_CREATED",
        adminId: access.session.id,
        adminName: access.session.username,
        targetId: userId,
        targetEmail: user.email || undefined,
        details: `Created loan ${loan.reference} for ${amount} XAF`,
      },
    });

    return NextResponse.json({
      message: "Demande de pret creee avec succes",
      loan,
    });
  } catch (error) {
    console.error("Create loan error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update loan status (approve, reject, mark default)
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { loanId, action, reason, paymentAmount } = body;

    if (!loanId || !action) {
      return NextResponse.json({ error: "loanId et action requis" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!loan) {
      return NextResponse.json({ error: "Pret non trouve" }, { status: 404 });
    }

    let updateData: any = {};
    let logAction = "";

    switch (action) {
      case "approve":
        if (loan.status !== "PENDING" && loan.status !== "UNDER_REVIEW") {
          return NextResponse.json({ error: "Ce pret ne peut pas etre approuve" }, { status: 400 });
        }
        updateData = {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: access.session.id,
        };
        logAction = "LOAN_APPROVED";
        break;

      case "disburse":
        if (loan.status !== "APPROVED") {
          return NextResponse.json({ error: "Le pret doit etre approuve avant le decaissement" }, { status: 400 });
        }
        // Calculate next payment date (1 month from now)
        const nextPayment = new Date();
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        
        updateData = {
          status: "ACTIVE",
          disbursedAt: new Date(),
          nextPaymentDate: nextPayment,
        };
        logAction = "LOAN_DISBURSED";

        // Create payment schedule
        const payments = [];
        let currentDate = new Date(nextPayment);
        let remainingPrincipal = loan.amount;
        const monthlyRate = loan.interestRate / 100 / 12;

        for (let i = 0; i < loan.term; i++) {
          const interestPayment = remainingPrincipal * monthlyRate;
          const principalPayment = loan.monthlyPayment - interestPayment;
          remainingPrincipal -= principalPayment;

          payments.push({
            loanId: loan.id,
            amount: loan.monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            dueDate: new Date(currentDate),
            status: "PENDING" as const,
          });

          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        await prisma.loanPayment.createMany({ data: payments });
        break;

      case "reject":
        if (loan.status !== "PENDING" && loan.status !== "UNDER_REVIEW") {
          return NextResponse.json({ error: "Ce pret ne peut pas etre rejete" }, { status: 400 });
        }
        updateData = {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectedReason: reason || "Non specifie",
        };
        logAction = "LOAN_REJECTED";
        break;

      case "mark_default":
        if (loan.status !== "ACTIVE") {
          return NextResponse.json({ error: "Seuls les prets actifs peuvent etre marques en defaut" }, { status: 400 });
        }
        updateData = {
          status: "DEFAULTED",
        };
        logAction = "LOAN_DEFAULTED";
        break;

      case "record_payment":
        if (loan.status !== "ACTIVE") {
          return NextResponse.json({ error: "Ce pret n'est pas actif" }, { status: 400 });
        }
        if (!paymentAmount || paymentAmount <= 0) {
          return NextResponse.json({ error: "Montant de paiement invalide" }, { status: 400 });
        }

        const newTotalPaid = loan.totalPaid + paymentAmount;
        const newRemainingBalance = Math.max(0, loan.remainingBalance - paymentAmount);

        updateData = {
          totalPaid: newTotalPaid,
          remainingBalance: newRemainingBalance,
          lastPaymentDate: new Date(),
          status: newRemainingBalance <= 0 ? "COMPLETED" : "ACTIVE",
        };

        // Update next payment date
        if (newRemainingBalance > 0) {
          const nextPaymentDate = new Date(loan.nextPaymentDate || new Date());
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          updateData.nextPaymentDate = nextPaymentDate;
        }

        logAction = "LOAN_PAYMENT_RECORDED";
        break;

      case "review":
        if (loan.status !== "PENDING") {
          return NextResponse.json({ error: "Ce pret est deja en cours de traitement" }, { status: 400 });
        }
        updateData = { status: "UNDER_REVIEW" };
        logAction = "LOAN_UNDER_REVIEW";
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: logAction,
        adminId: access.session.id,
        adminName: access.session.username,
        targetId: loan.userId,
        targetEmail: loan.user.email || undefined,
        details: `Action ${action} on loan ${loan.reference}${reason ? `. Reason: ${reason}` : ""}`,
      },
    });

    return NextResponse.json({
      message: "Pret mis a jour",
      loan: updatedLoan,
    });
  } catch (error) {
    console.error("Update loan error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
