import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

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

// GET - Get compliance data (KYC/AML)
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "kyc";
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    if (tab === "kyc") {
      // KYC Verifications
      const where: any = {};

      if (status !== "all") {
        where.kycStatus = status.toUpperCase();
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const [kycRequests, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            kycStatus: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      // Get KYC statistics
      const kycStats = await prisma.user.groupBy({
        by: ["kycStatus"],
        _count: true,
      });

      return NextResponse.json({
        type: "kyc",
        data: kycRequests.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          type: user.role === "BUSINESS_ADMIN" ? "Entreprise" : "Particulier",
          status: user.kycStatus?.toLowerCase() || "pending",
          submitted: user.createdAt,
          lastUpdated: user.updatedAt,
          risk: "low", // Would be calculated based on actual risk assessment
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        statistics: {
          pending: kycStats.find((s) => s.kycStatus === "PENDING")?._count || 0,
          approved: kycStats.find((s) => s.kycStatus === "VERIFIED")?._count || 0,
          rejected: kycStats.find((s) => s.kycStatus === "REJECTED")?._count || 0,
          total: kycStats.reduce((sum, s) => sum + s._count, 0),
        },
      });
    } else if (tab === "aml") {
      // AML Alerts - from audit logs with suspicious activity
      const amlAlerts = await prisma.auditLog.findMany({
        where: {
          action: {
            in: ["SUSPICIOUS_TRANSACTION", "HIGH_VALUE_TRANSACTION", "AML_ALERT", "FRAUD_DETECTED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      });

      // Get high-value transactions that might need review
      const highValueTransactions = await prisma.transaction.findMany({
        where: {
          amount: {
            gte: 10000, // Transactions over 10k
          },
          status: "COMPLETED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          sender: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({
        type: "aml",
        alerts: amlAlerts.map((alert) => ({
          id: alert.id,
          type: alert.action,
          details: alert.details,
          date: alert.createdAt,
          severity: alert.action.includes("FRAUD") ? "high" : "medium",
          status: "open",
        })),
        highValueTransactions: highValueTransactions.map((tx) => ({
          id: tx.id,
          account: tx.senderId,
          senderName: tx.sender?.name,
          amount: tx.amount,
          currency: tx.currency,
          date: tx.createdAt,
          type: tx.type,
        })),
        statistics: {
          openAlerts: amlAlerts.length,
          highValueCount: highValueTransactions.length,
        },
      });
    }

    return NextResponse.json({ error: "Tab non reconnu" }, { status: 400 });
  } catch (error) {
    console.error("Bank compliance error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Process KYC verification or AML alert
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { type, action, targetId, reason } = body;

    if (!type || !action || !targetId) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (type === "kyc") {
      // Process KYC verification
      let kycStatus: "VERIFIED" | "REJECTED" | "PENDING";
      switch (action) {
        case "approve":
          kycStatus = "VERIFIED";
          break;
        case "reject":
          kycStatus = "REJECTED";
          break;
        case "request_more_info":
          kycStatus = "PENDING";
          break;
        default:
          return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
      }

      const user = await prisma.user.update({
        where: { id: targetId },
        data: { kycStatus },
        select: {
          id: true,
          name: true,
          email: true,
          kycStatus: true,
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: `KYC_${action.toUpperCase()}`,
          userId: access.session.userId,
          details: `KYC ${action} for user ${user.email}. Reason: ${reason || "N/A"}`,
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json({
        message: `KYC ${action === "approve" ? "approuve" : action === "reject" ? "rejete" : "mis en attente"}`,
        user,
      });
    } else if (type === "aml") {
      // Process AML alert
      await prisma.auditLog.create({
        data: {
          action: `AML_${action.toUpperCase()}`,
          userId: access.session.userId,
          details: `AML alert ${targetId} ${action}. Reason: ${reason || "N/A"}`,
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json({
        message: `Alerte AML ${action === "resolve" ? "resolue" : action === "escalate" ? "escaladee" : "mise a jour"}`,
      });
    }

    return NextResponse.json({ error: "Type non reconnu" }, { status: 400 });
  } catch (error) {
    console.error("Process compliance error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
