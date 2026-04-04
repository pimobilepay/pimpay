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

// GET - List all savings accounts
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (type !== "all") {
      where.type = type;
    }

    if (status !== "all") {
      where.status = status;
    }

    const [accounts, total, typeStats, totals] = await Promise.all([
      prisma.savingsAccount.findMany({
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.savingsAccount.count({ where }),
      prisma.savingsAccount.groupBy({
        by: ["type"],
        _count: true,
        _sum: { balance: true },
      }),
      prisma.savingsAccount.aggregate({
        _sum: { balance: true },
        _avg: { interestRate: true },
      }),
    ]);

    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        userId: acc.userId,
        userName: acc.user.name || acc.user.username || "N/A",
        userEmail: acc.user.email || "N/A",
        accountNumber: acc.accountNumber,
        type: acc.type,
        balance: acc.balance,
        interestRate: acc.interestRate,
        currency: acc.currency,
        maturityDate: acc.maturityDate?.toISOString(),
        status: acc.status,
        createdAt: acc.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalAccounts: total,
        totalDeposits: totals._sum.balance || 0,
        avgInterestRate: totals._avg.interestRate || 3.5,
        byType: typeStats.reduce(
          (acc, t) => ({
            ...acc,
            [t.type]: { count: t._count, balance: t._sum.balance || 0 },
          }),
          {}
        ),
      },
    });
  } catch (error) {
    console.error("Bank savings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new savings account
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { userId, type, initialDeposit, interestRate, maturityMonths } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Generate account number
    const accountNumber = `SAV-${Date.now().toString().slice(-8)}-${nanoid(4).toUpperCase()}`;

    // Calculate maturity date for fixed deposits
    let maturityDate: Date | undefined;
    if (type === "FIXED_DEPOSIT" && maturityMonths) {
      maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + maturityMonths);
    }

    const account = await prisma.savingsAccount.create({
      data: {
        userId,
        accountNumber,
        type: type || "REGULAR",
        balance: initialDeposit || 0,
        interestRate: interestRate || 3.5,
        maturityDate,
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "SAVINGS_ACCOUNT_CREATED",
        adminId: access.session.id,
        targetId: userId,
        targetEmail: user.email,
        details: `Created ${type || "REGULAR"} savings account ${accountNumber}`,
      },
    });

    return NextResponse.json({
      message: "Compte epargne cree avec succes",
      account,
    });
  } catch (error) {
    console.error("Create savings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update savings account (deposit, withdraw, close)
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { accountId, action, amount } = body;

    if (!accountId || !action) {
      return NextResponse.json({ error: "accountId et action requis" }, { status: 400 });
    }

    const account = await prisma.savingsAccount.findUnique({
      where: { id: accountId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!account) {
      return NextResponse.json({ error: "Compte non trouve" }, { status: 404 });
    }

    let updateData: any = {};
    let logAction = "";

    switch (action) {
      case "deposit":
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }
        updateData = { balance: account.balance + amount };
        logAction = "SAVINGS_DEPOSIT";
        break;

      case "withdraw":
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }
        if (amount > account.balance) {
          return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
        }
        // Check if fixed deposit and not matured
        if (account.type === "FIXED_DEPOSIT" && account.maturityDate && new Date() < account.maturityDate) {
          return NextResponse.json({ error: "Le depot a terme n'a pas encore atteint sa maturite" }, { status: 400 });
        }
        updateData = { balance: account.balance - amount };
        logAction = "SAVINGS_WITHDRAWAL";
        break;

      case "close":
        if (account.balance > 0) {
          return NextResponse.json({ error: "Le solde doit etre a zero pour fermer le compte" }, { status: 400 });
        }
        updateData = { status: "CLOSED" };
        logAction = "SAVINGS_ACCOUNT_CLOSED";
        break;

      case "freeze":
        updateData = { status: "FROZEN" };
        logAction = "SAVINGS_ACCOUNT_FROZEN";
        break;

      case "unfreeze":
        updateData = { status: "ACTIVE" };
        logAction = "SAVINGS_ACCOUNT_UNFROZEN";
        break;

      case "apply_interest":
        // Apply monthly interest
        const monthlyRate = account.interestRate / 100 / 12;
        const interestEarned = account.balance * monthlyRate;
        updateData = { balance: account.balance + interestEarned };
        logAction = "INTEREST_APPLIED";
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    const updatedAccount = await prisma.savingsAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: logAction,
        adminId: access.session.id,
        targetId: account.userId,
        targetEmail: account.user.email,
        details: `Action ${action} on savings account ${account.accountNumber}. Amount: ${amount || "N/A"}`,
      },
    });

    return NextResponse.json({
      message: "Compte mis a jour",
      account: updatedAccount,
    });
  } catch (error) {
    console.error("Update savings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
