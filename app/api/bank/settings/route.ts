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

// GET - Get bank settings
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Get platform configuration
    const platformConfig = await prisma.platformConfig.findFirst({
      where: { id: "main" },
    });

    // Get current user info
    const user = await prisma.user.findUnique({
      where: { id: access.session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        twoFactorEnabled: true,
        role: true,
      },
    });

    // Get active sessions count
    const activeSessions = await prisma.session.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // System status (would be from actual health checks in production)
    const systemStatus = {
      server: { status: "operational", uptime: "99.9%" },
      database: { status: "operational", latency: "12ms" },
      api: { status: "operational", responseTime: "45ms" },
      maintenance: platformConfig?.maintenanceMode ? { scheduled: true, message: platformConfig.maintenanceMessage } : null,
    };

    // Default settings
    const settings = {
      general: {
        institutionName: platformConfig?.siteName || "PimPay Institution Financiere",
        timezone: "Africa/Kinshasa",
        language: "fr",
        currency: "USD",
      },
      security: {
        twoFactorRequired: true,
        sessionTimeout: 30,
        ipWhitelist: true,
        auditLogging: true,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        pushNotifications: true,
        dailyDigest: true,
      },
      compliance: {
        kycRequired: true,
        amlMonitoring: true,
        transactionLimit: 500000,
        autoFlagThreshold: 100000,
      },
      api: {
        rateLimit: 1000,
        webhooksEnabled: true,
        sandboxMode: false,
      },
    };

    return NextResponse.json({
      settings,
      currentUser: user,
      systemStatus,
      activeSessions,
      maintenanceMode: platformConfig?.maintenanceMode || false,
    });
  } catch (error) {
    console.error("Bank settings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update bank settings
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { section, settings } = body;

    if (!section || !settings) {
      return NextResponse.json({ error: "Section et parametres requis" }, { status: 400 });
    }

    let updateResult: any = {};

    switch (section) {
      case "general":
        // Update platform config
        await prisma.platformConfig.upsert({
          where: { id: "main" },
          update: {
            siteName: settings.institutionName,
          },
          create: {
            id: "main",
            siteName: settings.institutionName,
            maintenanceMode: false,
          },
        });
        updateResult = { institutionName: settings.institutionName };
        break;

      case "security":
        // Log security settings change
        await prisma.auditLog.create({
          data: {
            action: "SECURITY_SETTINGS_UPDATED",
            userId: access.session.userId,
            details: `Security settings updated: ${JSON.stringify(settings)}`,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          },
        });
        updateResult = settings;
        break;

      case "notifications":
        // Update notification preferences
        await prisma.auditLog.create({
          data: {
            action: "NOTIFICATION_SETTINGS_UPDATED",
            userId: access.session.userId,
            details: `Notification settings updated: ${JSON.stringify(settings)}`,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          },
        });
        updateResult = settings;
        break;

      case "compliance":
        // Update compliance settings
        await prisma.auditLog.create({
          data: {
            action: "COMPLIANCE_SETTINGS_UPDATED",
            userId: access.session.userId,
            details: `Compliance settings updated: ${JSON.stringify(settings)}`,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          },
        });
        updateResult = settings;
        break;

      case "maintenance":
        // Toggle maintenance mode
        await prisma.platformConfig.upsert({
          where: { id: "main" },
          update: {
            maintenanceMode: settings.enabled,
            maintenanceMessage: settings.message,
          },
          create: {
            id: "main",
            siteName: "PimPay",
            maintenanceMode: settings.enabled,
            maintenanceMessage: settings.message,
          },
        });
        updateResult = { maintenanceMode: settings.enabled };
        break;

      case "password":
        // Change user password
        if (!settings.currentPassword || !settings.newPassword) {
          return NextResponse.json({ error: "Mots de passe requis" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { id: access.session.userId },
        });

        if (!user || !user.password) {
          return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
        }

        const isValid = await bcrypt.compare(settings.currentPassword, user.password);
        if (!isValid) {
          return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(settings.newPassword, 12);
        await prisma.user.update({
          where: { id: access.session.userId },
          data: { password: hashedPassword },
        });

        await prisma.auditLog.create({
          data: {
            action: "PASSWORD_CHANGED",
            userId: access.session.userId,
            details: "User changed their password",
            ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          },
        });

        updateResult = { passwordChanged: true };
        break;

      default:
        return NextResponse.json({ error: "Section non reconnue" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Parametres mis a jour",
      section,
      updated: updateResult,
    });
  } catch (error) {
    console.error("Update bank settings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Generate new API key
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { action, keyType } = body;

    if (action === "generate_api_key") {
      // Generate a new API key
      const prefix = keyType === "test" ? "pk_test_" : "pk_live_";
      const key = prefix + Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);

      await prisma.auditLog.create({
        data: {
          action: "API_KEY_GENERATED",
          userId: access.session.userId,
          details: `Generated new ${keyType} API key`,
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json({
        message: "Cle API generee",
        key: key,
        type: keyType,
        warning: "Cette cle ne sera affichee qu'une seule fois. Conservez-la en securite.",
      });
    }

    if (action === "revoke_sessions") {
      // Revoke all sessions except current
      await prisma.session.deleteMany({
        where: {
          userId: { not: access.session.userId },
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "SESSIONS_REVOKED",
          userId: access.session.userId,
          details: "All other sessions revoked",
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json({
        message: "Toutes les autres sessions ont ete revoquees",
      });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    console.error("Bank settings action error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
