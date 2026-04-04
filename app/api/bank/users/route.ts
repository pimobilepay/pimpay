import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Helper to check if user has bank admin access
async function checkBankAccess(req: Request) {
  const session = await verifyAuth(req);
  if (!session) {
    return { error: "Non autorise", status: 401 };
  }
  if (session.role !== "BANK_ADMIN" && session.role !== "ADMIN") {
    return { error: "Acces refuse. Portail reserve aux administrateurs de la Banque.", status: 403 };
  }
  return { session };
}

// GET - List all users with filters
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";
    const kycStatus = searchParams.get("kycStatus") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    if (role !== "all") {
      where.role = role;
    }

    if (status !== "all") {
      where.status = status;
    }

    if (kycStatus !== "all") {
      where.kycStatus = kycStatus;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          kycStatus: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sentTransactions: true,
              receivedTransactions: true,
              wallets: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Get statistics
    const stats = await prisma.user.groupBy({
      by: ["status"],
      _count: true,
    });

    const roleStats = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    const twoFaCount = await prisma.user.count({
      where: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        transactionCount: user._count.sentTransactions + user._count.receivedTransactions,
        walletCount: user._count.wallets,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
        byRole: roleStats.reduce((acc, r) => ({ ...acc, [r.role]: r._count }), {}),
        with2FA: twoFaCount,
        total,
      },
    });
  } catch (error) {
    console.error("Bank users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new bank user
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { name, email, phone, password, role, department } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "Cet email est deja utilise" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username: email.split("@")[0].toLowerCase(),
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: role || "BANK_ADMIN",
        status: "ACTIVE",
        kycStatus: "VERIFIED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "USER_CREATED",
        adminId: access.session.id,
        adminName: access.session.username,
        targetEmail: user.email,
        details: `Created bank user: ${user.email}`,
      },
    });

    return NextResponse.json({
      message: "Utilisateur cree avec succes",
      user,
    });
  } catch (error) {
    console.error("Create bank user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update user status or details
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { userId, action, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "userId et action requis" }, { status: 400 });
    }

    let updateData: any = {};
    let logAction = "";

    switch (action) {
      case "suspend":
        updateData = { status: "SUSPENDED" };
        logAction = "USER_SUSPENDED";
        break;
      case "activate":
        updateData = { status: "ACTIVE" };
        logAction = "USER_ACTIVATED";
        break;
      case "verify_kyc":
        updateData = { kycStatus: "VERIFIED" };
        logAction = "KYC_VERIFIED";
        break;
      case "reject_kyc":
        updateData = { kycStatus: "REJECTED" };
        logAction = "KYC_REJECTED";
        break;
      case "enable_2fa":
        updateData = { twoFactorEnabled: true };
        logAction = "2FA_ENABLED";
        break;
      case "disable_2fa":
        updateData = { twoFactorEnabled: false };
        logAction = "2FA_DISABLED";
        break;
      case "update_role":
        if (!data?.role) {
          return NextResponse.json({ error: "Role requis" }, { status: 400 });
        }
        updateData = { role: data.role };
        logAction = "ROLE_UPDATED";
        break;
      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        kycStatus: true,
        role: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: logAction,
        adminId: access.session.id,
        adminName: access.session.username,
        targetId: userId,
        targetEmail: user.email,
        details: `Action ${action} on user ${user.email}`,
      },
    });

    return NextResponse.json({
      message: "Utilisateur mis a jour",
      user,
    });
  } catch (error) {
    console.error("Update bank user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
