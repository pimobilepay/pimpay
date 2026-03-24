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

// Alert type mapping
const alertTypeMapping: { [key: string]: { type: string; severity: string } } = {
  SUSPICIOUS_LOGIN: { type: "security", severity: "high" },
  FAILED_LOGIN: { type: "security", severity: "medium" },
  HIGH_VALUE_TRANSACTION: { type: "transaction", severity: "medium" },
  SUSPICIOUS_TRANSACTION: { type: "transaction", severity: "high" },
  AML_ALERT: { type: "compliance", severity: "high" },
  KYC_FLAGGED: { type: "compliance", severity: "medium" },
  SYSTEM_ALERT: { type: "system", severity: "low" },
  MAINTENANCE_SCHEDULED: { type: "system", severity: "low" },
  LIQUIDITY_WARNING: { type: "liquidity", severity: "high" },
  USER_SPIKE: { type: "users", severity: "low" },
};

// GET - Get all alerts
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const severity = searchParams.get("severity") || "all";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause for audit logs that represent alerts
    const alertActions = Object.keys(alertTypeMapping);
    const where: any = {
      action: {
        in: alertActions,
      },
    };

    if (search) {
      where.details = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Filter by type
    if (type !== "all") {
      const actionsForType = Object.entries(alertTypeMapping)
        .filter(([_, v]) => v.type === type)
        .map(([k, _]) => k);
      where.action = { in: actionsForType };
    }

    // Get alerts from audit logs
    const [alerts, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Transform alerts with type and severity
    const transformedAlerts = alerts.map((alert) => {
      const mapping = alertTypeMapping[alert.action] || { type: "system", severity: "low" };
      return {
        id: alert.id,
        type: mapping.type,
        severity: mapping.severity,
        title: formatAlertTitle(alert.action),
        description: alert.details || "",
        time: alert.createdAt,
        status: "open", // Would be stored in database in production
        ipAddress: alert.ipAddress,
      };
    });

    // Apply severity filter after transformation
    const filteredAlerts = severity === "all" 
      ? transformedAlerts 
      : transformedAlerts.filter(a => a.severity === severity);

    // Get statistics
    const stats = {
      total: total,
      open: Math.floor(total * 0.3), // Mock - would be from actual status field
      pending: Math.floor(total * 0.2),
      resolved: Math.floor(total * 0.5),
      highPriority: alerts.filter(a => 
        alertTypeMapping[a.action]?.severity === "high"
      ).length,
    };

    return NextResponse.json({
      alerts: filteredAlerts,
      pagination: {
        total: filteredAlerts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredAlerts.length / limit),
      },
      statistics: stats,
    });
  } catch (error) {
    console.error("Bank alerts error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new alert
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { type, title, description, severity } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Type et titre requis" }, { status: 400 });
    }

    // Map type to action
    const actionMap: { [key: string]: string } = {
      security: "SYSTEM_ALERT",
      transaction: "HIGH_VALUE_TRANSACTION",
      compliance: "KYC_FLAGGED",
      system: "SYSTEM_ALERT",
      liquidity: "LIQUIDITY_WARNING",
      users: "USER_SPIKE",
    };

    const action = actionMap[type] || "SYSTEM_ALERT";

    const alert = await prisma.auditLog.create({
      data: {
        action,
        userId: access.session.userId,
        details: `${title}: ${description || ""}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      message: "Alerte creee",
      alert: {
        id: alert.id,
        type,
        title,
        description,
        severity: severity || "medium",
        status: "open",
        createdAt: alert.createdAt,
      },
    });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update alert status
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { alertId, action, notes } = body;

    if (!alertId || !action) {
      return NextResponse.json({ error: "alertId et action requis" }, { status: 400 });
    }

    // Log the action on the alert
    await prisma.auditLog.create({
      data: {
        action: `ALERT_${action.toUpperCase()}`,
        userId: access.session.userId,
        details: `Alert ${alertId} ${action}. Notes: ${notes || "N/A"}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      message: `Alerte ${action === "resolve" ? "resolue" : action === "acknowledge" ? "prise en compte" : "mise a jour"}`,
      alertId,
      newStatus: action === "resolve" ? "resolved" : action === "acknowledge" ? "acknowledged" : "open",
    });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Helper function to format alert titles
function formatAlertTitle(action: string): string {
  const titles: { [key: string]: string } = {
    SUSPICIOUS_LOGIN: "Tentative de connexion suspecte",
    FAILED_LOGIN: "Echec de connexion",
    HIGH_VALUE_TRANSACTION: "Transaction de haut montant",
    SUSPICIOUS_TRANSACTION: "Transaction suspecte detectee",
    AML_ALERT: "Alerte anti-blanchiment",
    KYC_FLAGGED: "Verification KYC signalee",
    SYSTEM_ALERT: "Alerte systeme",
    MAINTENANCE_SCHEDULED: "Maintenance programmee",
    LIQUIDITY_WARNING: "Alerte de liquidite",
    USER_SPIKE: "Pic d'activite utilisateurs",
  };
  return titles[action] || action;
}
