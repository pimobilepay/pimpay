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

// GET - Get interbank transfers and partner banks
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";
    const typeFilter = searchParams.get("type") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Calculate date range
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
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get interbank transfers (transactions with external references)
    const where: any = {
      createdAt: {
        gte: startDate,
      },
      OR: [
        { type: "BANK_TRANSFER" },
        { reference: { startsWith: "IB" } },
        { amount: { gte: 100000 } }, // High value transactions often interbank
      ],
    };

    if (typeFilter === "incoming") {
      where.type = "DEPOSIT";
    } else if (typeFilter === "outgoing") {
      where.type = "WITHDRAWAL";
    }

    const [transfers, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          sender: {
            select: {
              name: true,
            },
          },
          receiver: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    // Calculate totals
    const incomingTotal = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: "DEPOSIT",
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    const outgoingTotal = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    const pendingCount = await prisma.transaction.count({
      where: {
        ...where,
        status: "PENDING",
      },
    });

    // Mock partner banks (would be stored in database in production)
    const partnerBanks = [
      { id: "PB001", name: "Banque Centrale du Congo", swift: "BCCNCDKX", country: "RDC", status: "active", volume: 45000000 },
      { id: "PB002", name: "Rawbank", swift: "RAWBCDKI", country: "RDC", status: "active", volume: 32000000 },
      { id: "PB003", name: "FBN Bank", swift: "FBNKCDKI", country: "RDC", status: "active", volume: 18500000 },
      { id: "PB004", name: "Equity BCDC", swift: "EQTYCDKX", country: "RDC", status: "active", volume: 28000000 },
      { id: "PB005", name: "Access Bank", swift: "ABNGCDKI", country: "RDC", status: "maintenance", volume: 15000000 },
    ];

    // Get daily flow data for chart
    const dailyFlows = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as incoming,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as outgoing
      FROM transactions
      WHERE created_at >= ${startDate}
        AND (type IN ('DEPOSIT', 'WITHDRAWAL') OR amount >= 100000)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    ` as any[];

    return NextResponse.json({
      transfers: transfers.map((tx) => ({
        id: tx.id,
        reference: tx.reference || `IB-${tx.id.slice(0, 8)}`,
        institution: tx.sender?.name || tx.receiver?.name || "Institution Externe",
        swift: "XXXX" + tx.id.slice(0, 4).toUpperCase(),
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type === "DEPOSIT" ? "incoming" : "outgoing",
        status: tx.status.toLowerCase(),
        date: tx.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalIncoming: incomingTotal._sum.amount || 0,
        totalOutgoing: outgoingTotal._sum.amount || 0,
        pendingCount,
        partnerCount: partnerBanks.filter((p) => p.status === "active").length,
      },
      partnerBanks,
      flowData: dailyFlows.map((d: any) => ({
        name: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short" }),
        entrant: Number(d.incoming) || 0,
        sortant: Number(d.outgoing) || 0,
      })),
      period,
    });
  } catch (error) {
    console.error("Bank interbank error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create new interbank transfer
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { institution, swift, amount, currency, type, reference, notes } = body;

    if (!institution || !amount || !currency || !type) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Create the interbank transfer
    const transfer = await prisma.transaction.create({
      data: {
        type: type === "outgoing" ? "WITHDRAWAL" : "DEPOSIT",
        amount: parseFloat(amount),
        currency,
        status: "PENDING",
        reference: reference || `IB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        description: `Transfert interbancaire ${type === "outgoing" ? "vers" : "depuis"} ${institution} (${swift})`,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "INTERBANK_TRANSFER_CREATED",
        userId: access.session.userId,
        details: `Interbank transfer ${type}: ${amount} ${currency} ${type === "outgoing" ? "to" : "from"} ${institution}. Notes: ${notes || "N/A"}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      message: "Transfert interbancaire cree",
      transfer: {
        id: transfer.id,
        reference: transfer.reference,
        institution,
        swift,
        amount: transfer.amount,
        currency: transfer.currency,
        type,
        status: transfer.status,
        date: transfer.createdAt,
      },
    });
  } catch (error) {
    console.error("Create interbank transfer error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update transfer status
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { transferId, action, reason } = body;

    if (!transferId || !action) {
      return NextResponse.json({ error: "transferId et action requis" }, { status: 400 });
    }

    let status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
    switch (action) {
      case "approve":
        status = "COMPLETED";
        break;
      case "reject":
        status = "FAILED";
        break;
      case "cancel":
        status = "CANCELLED";
        break;
      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    const transfer = await prisma.transaction.update({
      where: { id: transferId },
      data: { status },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: `INTERBANK_TRANSFER_${action.toUpperCase()}`,
        userId: access.session.userId,
        details: `Transfer ${transferId} ${action}. Reason: ${reason || "N/A"}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      message: `Transfert ${action === "approve" ? "approuve" : action === "reject" ? "rejete" : "annule"}`,
      transfer,
    });
  } catch (error) {
    console.error("Update interbank transfer error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
