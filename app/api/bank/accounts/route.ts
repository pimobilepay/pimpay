import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { logApiError, logSystemEvent } from "@/lib/systemLogger";

// ✅ FORCE LE RENDU DYNAMIQUE - Indispensable pour Vercel
export const dynamic = "force-dynamic";

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

// GET - List all accounts (wallets) with filters
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const currency = searchParams.get("currency") || "all";
    const type = searchParams.get("type") || "all";
    const sortBy = searchParams.get("sortBy") || "balance";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (currency !== "all") where.currency = currency;
    if (type !== "all") where.type = type;

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      };
    }

    let orderBy: any = { balance: "desc" };
    if (sortBy === "recent") orderBy = { createdAt: "desc" };
    else if (sortBy === "activity") orderBy = { updatedAt: "desc" };

    const [wallets, total, totalBalanceResult, frozenBalanceResult, currencyStats, typeStats] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true, email: true } },
          _count: { select: { transactionsFrom: true, transactionsTo: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.wallet.count({ where }),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.wallet.aggregate({ _sum: { frozenBalance: true } }),
      prisma.wallet.groupBy({
        by: ["currency"],
        _count: true,
        _sum: { balance: true },
      }),
      prisma.wallet.groupBy({
        by: ["type"],
        _count: true,
      }),
    ]);

    const accounts = wallets.map((wallet) => ({
      id: wallet.id,
      userId: wallet.userId,
      userName: wallet.user.name || wallet.user.username || "N/A",
      userEmail: wallet.user.email || "N/A",
      currency: wallet.currency,
      type: wallet.type,
      balance: wallet.balance || 0,
      frozenBalance: wallet.frozenBalance || 0,
      createdAt: wallet.createdAt.toISOString(),
      lastActivity: wallet.updatedAt.toISOString(),
      transactionCount: (wallet._count?.transactionsFrom || 0) + (wallet._count?.transactionsTo || 0),
    }));

    return NextResponse.json({
      accounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      statistics: {
        totalAccounts: total,
        totalBalance: totalBalanceResult._sum.balance || 0,
        totalFrozen: frozenBalanceResult._sum.frozenBalance || 0,
        byCurrency: currencyStats.reduce((acc, s) => ({
          ...acc,
          [s.currency]: { count: s._count, balance: s._sum.balance || 0 },
        }), {}),
        byType: typeStats.reduce((acc, t) => ({ ...acc, [t.type]: t._count }), {}),
      },
    });
  } catch (error: unknown) {
    console.error("Bank accounts error:", error);
    await logApiError("BANK_ACCOUNTS_API", "GET_ACCOUNTS", error, { requestId: `BA-${Date.now()}` });
    return NextResponse.json({ error: "Erreur serveur", details: (error as Error)?.message }, { status: 500 });
  }
}

// PUT - Freeze or unfreeze account (Action complète)
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const { accountId, action, amount } = body;

    if (!accountId || !action) return NextResponse.json({ error: "accountId et action requis" }, { status: 400 });

    const wallet = await prisma.wallet.findUnique({
      where: { id: accountId },
      include: { user: { select: { email: true } } },
    });

    if (!wallet) return NextResponse.json({ error: "Compte non trouve" }, { status: 404 });

    let updateData: any = {};
    let logAction = "";

    switch (action) {
      case "freeze":
        const freezeAmount = amount || wallet.balance;
        if (freezeAmount > wallet.balance) return NextResponse.json({ error: "Montant insuffisant" }, { status: 400 });
        updateData = { balance: wallet.balance - freezeAmount, frozenBalance: wallet.frozenBalance + freezeAmount };
        logAction = "ACCOUNT_FROZEN";
        break;

      case "unfreeze":
        const unfreezeAmount = amount || wallet.frozenBalance;
        if (unfreezeAmount > wallet.frozenBalance) return NextResponse.json({ error: "Montant gele insuffisant" }, { status: 400 });
        updateData = { balance: wallet.balance + unfreezeAmount, frozenBalance: wallet.frozenBalance - unfreezeAmount };
        logAction = "ACCOUNT_UNFROZEN";
        break;

      case "adjust":
        if (typeof amount !== "number") return NextResponse.json({ error: "Montant requis pour l'ajustement" }, { status: 400 });
        updateData = { balance: wallet.balance + amount };
        logAction = "BALANCE_ADJUSTED";
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: accountId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: logAction,
        adminId: access.session.id,
        adminName: access.session.username,
        targetId: wallet.userId,
        targetEmail: wallet.user.email || undefined,
        details: `Action ${action} on wallet ${wallet.id} (${wallet.currency}). Amount: ${amount || "full"}`,
      },
    });

    return NextResponse.json({
      message: "Compte mis a jour",
      account: { id: updatedWallet.id, balance: updatedWallet.balance, frozenBalance: updatedWallet.frozenBalance },
    });
  } catch (error: unknown) {
    await logApiError("BANK_ACCOUNTS_API", "UPDATE_ACCOUNT", error, { requestId: `BA-UPD-${Date.now()}` });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new wallet/account for a user (Action complète)
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const { userId, currency, type, initialBalance } = body;

    if (!userId || !currency) return NextResponse.json({ error: "userId et currency requis" }, { status: 400 });

    const existing = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    if (existing) return NextResponse.json({ error: "Ce compte existe deja pour cet utilisateur" }, { status: 400 });

    const wallet = await prisma.wallet.create({
      data: { userId, currency, type: type || "FIAT", balance: initialBalance || 0 },
    });

    await prisma.auditLog.create({
      data: {
        action: "WALLET_CREATED",
        adminId: access.session.id,
        adminName: access.session.username,
        targetId: userId,
        details: `Created ${currency} wallet for user ${userId}`,
      },
    });

    return NextResponse.json({ message: "Compte cree avec succes", account: wallet });
  } catch (error: unknown) {
    await logApiError("BANK_ACCOUNTS_API", "CREATE_ACCOUNT", error, { requestId: `BA-CRT-${Date.now()}` });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
