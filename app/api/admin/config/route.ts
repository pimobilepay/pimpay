export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

/**
 * SECURITY FIXES :
 *
 * [CRITIQUE] GET : adminAuth() maintenant OBLIGATOIRE — les stats et logs d'audit
 *   ne sont plus accessibles sans authentification.
 *
 * [ÉLEVÉ] POST AUTO_RESUME : protégé par adminAuth() comme toutes les autres actions.
 *   La logique d'expiration de maintenance reste, mais ne peut être déclenchée
 *   que par un admin authentifié ou le cron système interne.
 *
 * [CRITIQUE] error.stack : jamais inclus dans les réponses HTTP.
 */

const ConfigModel = prisma.systemConfig;

const FALLBACK_CONFIG = {
  id: "GLOBAL_CONFIG",
  appVersion: "2.4.0-STABLE",
  maintenanceMode: false,
  comingSoonMode: false,
  consensusPrice: 314159.0,
  stakingAPY: 12.0,
  transactionFee: 0.5,
  minWithdrawal: 10.0,
  globalAnnouncement: "",
  forceUpdate: false,
  referralBonus: 0.0000318,
  referralWelcomeBonus: 0.0000159,
  auditLogs: [],
  isAdmin: false,
  stats: { totalUsers: 0, activeSessions: 0, piVolume24h: 0 },
};

// --- GET : RÉCUPÉRATION DE LA CONFIGURATION ET DES STATS ---
export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(FALLBACK_CONFIG);
  }

  // FIX [CRITIQUE]: adminAuth obligatoire — retour 401 immédiat si absent
  const adminSession = await adminAuth(req);
  if (!adminSession) {
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  try {
    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          appVersion: "2.4.0-STABLE",
          maintenanceMode: false,
          comingSoonMode: false,
          consensusPrice: 314159.0,
          stakingAPY: 12.0,
          transactionFee: 0.5,
          minWithdrawal: 10.0,
          globalAnnouncement: "PIMPAY PROTOCOL: Network operational.",
          forceUpdate: false,
        },
      });
    }

    const [totalUsers, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { isActive: true } }),
    ]);

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      ...config,
      auditLogs: logs,
      isAdmin: true,
      isBankAdmin: false,
      isBusinessAdmin: false,
      isAgent: false,
      stats: {
        totalUsers,
        activeSessions,
        piVolume24h: 314.15,
      },
    });
  } catch (error: unknown) {
    // FIX: pas de stack dans la réponse
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("GET_CONFIG_ERROR:", message);
    return NextResponse.json(FALLBACK_CONFIG);
  }
}

// --- POST : CENTRE DE COMMANDE ACTIONS ADMIN ---
export async function POST(req: NextRequest) {
  // FIX [ÉLEVÉ]: adminAuth AVANT toute action, y compris AUTO_RESUME
  const adminSession = await adminAuth(req);
  if (!adminSession) {
    return NextResponse.json(
      { error: "Accès refusé — Protocole Elara" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    // AUTO-RESUME : maintenant protégé par adminAuth (vérifié ci-dessus)
    if (action === "AUTO_RESUME") {
      const current = await ConfigModel.findUnique({
        where: { id: "GLOBAL_CONFIG" },
      });
      if (current?.maintenanceMode && current?.maintenanceUntil) {
        const now = new Date();
        const until = new Date(current.maintenanceUntil);
        if (now >= until) {
          const resumed = await ConfigModel.update({
            where: { id: "GLOBAL_CONFIG" },
            data: { maintenanceMode: false, maintenanceUntil: null },
          });
          await prisma.auditLog
            .create({
              data: {
                adminName: adminSession.email || "Admin",
                action: "AUTO_RESUME_MAINTENANCE",
                details: "Maintenance désactivée automatiquement.",
              },
            })
            .catch(() => null);
          return NextResponse.json(resumed);
        }
      }
      return NextResponse.json(
        { error: "Maintenance encore active" },
        { status: 400 }
      );
    }

    // 1. RESET PASSWORD / PIN
    if (action === "RESET_PASSWORD" || action === "RESET_PIN") {
      const { userId, newSecret } = body;
      if (!userId || !newSecret)
        return NextResponse.json(
          { error: "Données manquantes" },
          { status: 400 }
        );

      const hashedSecret = await bcrypt.hash(newSecret, 10);
      const updateData =
        action === "RESET_PASSWORD"
          ? { password: hashedSecret }
          : { pin: hashedSecret };

      await prisma.user.update({ where: { id: userId }, data: updateData });

      await prisma.auditLog.create({
        data: {
          adminName: adminSession.email || "Admin",
          action,
          details: `Réinitialisation pour l'utilisateur ${userId}`,
        },
      });

      return NextResponse.json({ message: "Réinitialisation réussie" });
    }

    // 2. TOGGLE MODE
    if (action === "TOGGLE_MODE") {
      const { modeType } = body;
      const ALLOWED_MODES = ["maintenanceMode", "comingSoonMode"] as const;
      if (!ALLOWED_MODES.includes(modeType)) {
        return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
      }
      const current = await ConfigModel.findUnique({
        where: { id: "GLOBAL_CONFIG" },
      });
      const updated = await ConfigModel.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          [modeType]: !current?.[modeType as keyof typeof current],
        },
      });
      return NextResponse.json(updated);
    }

    // 3. SYNC CORE (mise à jour globale)
    const {
      appVersion, globalAnnouncement, transactionFee,
      maintenanceMode, comingSoonMode, minWithdrawal,
      consensusPrice, stakingAPY, forceUpdate, maintenanceUntil,
      transferFee, withdrawFee, depositCryptoFee, exchangeFee,
      depositMobileFee, depositCardFee, withdrawMobileFee,
      withdrawBankFee, fiatTransferFee,
      cardPaymentFee, merchantPaymentFee, billPaymentFee, qrPaymentFee,
      maxWithdrawal, referralBonus, referralWelcomeBonus,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (appVersion !== undefined) updateData.appVersion = appVersion;
    if (globalAnnouncement !== undefined) updateData.globalAnnouncement = globalAnnouncement;
    if (transactionFee !== undefined) updateData.transactionFee = Number(transactionFee);
    if (maintenanceMode !== undefined) updateData.maintenanceMode = Boolean(maintenanceMode);
    if (comingSoonMode !== undefined) updateData.comingSoonMode = Boolean(comingSoonMode);
    if (minWithdrawal !== undefined) updateData.minWithdrawal = Number(minWithdrawal);
    if (maxWithdrawal !== undefined) updateData.maxWithdrawal = Number(maxWithdrawal);
    if (consensusPrice !== undefined) updateData.consensusPrice = Number(consensusPrice);
    if (stakingAPY !== undefined) updateData.stakingAPY = Number(stakingAPY);
    if (forceUpdate !== undefined) updateData.forceUpdate = Boolean(forceUpdate);
    if (maintenanceUntil !== undefined)
      updateData.maintenanceUntil = maintenanceUntil ? new Date(maintenanceUntil) : null;
    if (maintenanceMode === false) updateData.maintenanceUntil = null;
    if (transferFee !== undefined) updateData.transferFee = Number(transferFee);
    if (withdrawFee !== undefined) updateData.withdrawFee = Number(withdrawFee);
    if (depositCryptoFee !== undefined) updateData.depositCryptoFee = Number(depositCryptoFee);
    if (exchangeFee !== undefined) updateData.exchangeFee = Number(exchangeFee);
    if (depositMobileFee !== undefined) updateData.depositMobileFee = Number(depositMobileFee);
    if (depositCardFee !== undefined) updateData.depositCardFee = Number(depositCardFee);
    if (withdrawMobileFee !== undefined) updateData.withdrawMobileFee = Number(withdrawMobileFee);
    if (withdrawBankFee !== undefined) updateData.withdrawBankFee = Number(withdrawBankFee);
    if (fiatTransferFee !== undefined) updateData.fiatTransferFee = Number(fiatTransferFee);
    if (cardPaymentFee !== undefined) updateData.cardPaymentFee = Number(cardPaymentFee);
    if (merchantPaymentFee !== undefined) updateData.merchantPaymentFee = Number(merchantPaymentFee);
    if (billPaymentFee !== undefined) updateData.billPaymentFee = Number(billPaymentFee);
    if (qrPaymentFee !== undefined) updateData.qrPaymentFee = Number(qrPaymentFee);
    if (referralBonus !== undefined) updateData.referralBonus = Number(referralBonus);
    if (referralWelcomeBonus !== undefined) updateData.referralWelcomeBonus = Number(referralWelcomeBonus);

    const updatedConfig = await ConfigModel.update({
      where: { id: "GLOBAL_CONFIG" },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        adminName: adminSession.email || "Admin",
        action: "UPDATE_SYSTEM_CONFIG",
        details: `Synchronisation noyau v${appVersion} effectuée.`,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("ADMIN_POST_ERROR:", message);
    // FIX: pas de stack dans la réponse
    return NextResponse.json(
      { error: "Échec de l'opération noyau" },
      { status: 500 }
    );
  }
}
