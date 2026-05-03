export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const ConfigModel = prisma.systemConfig;

// Defaults returned when the database is not reachable (e.g. missing DATABASE_URL)
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
  referralBonus: 0.0000318,       // Bonus parrain - apres KYC + depot du filleul
  referralWelcomeBonus: 0.0000159, // Bonus filleul - apres son KYC + depot
  auditLogs: [],
  isAdmin: false,
  stats: { totalUsers: 0, activeSessions: 0, piVolume24h: 0 },
};

// --- GET : RÉCUPÉRATION DE LA CONFIGURATION ET DES STATS ---
export async function GET(req: NextRequest) {
  // Early exit when DATABASE_URL is not configured
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(FALLBACK_CONFIG);
  }

  try {
    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

    // Initialisation si inexistant
    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          appVersion: "2.4.0-STABLE",
          maintenanceMode: false,
          comingSoonMode: false, // Initialisé par défaut
          consensusPrice: 314159.0,
          stakingAPY: 12.0,
          transactionFee: 0.5,
          minWithdrawal: 10.0,
          globalAnnouncement: "PIMPAY PROTOCOL: Network operational.",
          forceUpdate: false,
        }
      });
    }

    // Récupération des statistiques réelles pour l'admin
    const [totalUsers, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { isActive: true } })
    ]);

    let logs: any[] = [];
    let isAdmin = false;
    let isBankAdmin = false;
    let isBusinessAdmin = false;
    let isAgent = false;

    try {
      // Check if the current user is admin (via JWT token in cookie or header)
      const adminSession = await adminAuth(req);
      if (adminSession) {
        isAdmin = true;
        // Fetch audit logs with admin user details (avatar, role)
        const rawLogs = await prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
              }
            }
          }
        });
        
        // Get the latest session for each admin to include session/location info
        logs = await Promise.all(rawLogs.map(async (log) => {
          let sessionInfo = null;
          if (log.adminId) {
            sessionInfo = await prisma.session.findFirst({
              where: { userId: log.adminId },
              orderBy: { createdAt: 'desc' },
              select: {
                ip: true,
                device: true,
                browser: true,
                os: true,
                city: true,
                country: true,
                token: true,
              }
            });
          }
          
          return {
            id: log.id,
            adminName: log.admin?.name || log.admin?.username || log.adminName || 'Admin',
            adminAvatar: log.admin?.avatar || null,
            adminRole: log.admin?.role || 'ADMIN',
            action: log.action,
            details: log.details,
            createdAt: log.createdAt,
            targetId: log.targetId,
            targetEmail: log.targetEmail,
            // Session/Location info from the admin's last session
            ipAddress: sessionInfo?.ip || null,
            device: sessionInfo?.device || null,
            browser: sessionInfo?.browser || null,
            os: sessionInfo?.os || null,
            city: sessionInfo?.city || null,
            country: sessionInfo?.country || null,
            location: sessionInfo?.city && sessionInfo?.country 
              ? `${sessionInfo.city}, ${sessionInfo.country}` 
              : null,
            sessionId: sessionInfo?.token ? `sess_${sessionInfo.token.slice(0, 8)}` : null,
            // Flags based on action type
            flags: {
              suspicious: log.action?.includes('DELETE') || log.action?.includes('BLOCK'),
              critical: log.action?.includes('RESET') || log.action?.includes('FORCE'),
              automated: log.adminName === 'SYSTEM',
              requiresReview: log.action?.includes('WITHDRAWAL') && parseFloat(log.details || '0') > 1000,
            }
          };
        }));
      } else {
        // Fallback: check via verifyAuth for any admin role
        const userSession = await verifyAuth(req);
        if (userSession) {
          if (userSession.role === "ADMIN") {
            isAdmin = true;
          } else if (userSession.role === "BANK_ADMIN") {
            isBankAdmin = true;
          } else if (userSession.role === "BUSINESS_ADMIN") {
            isBusinessAdmin = true;
          } else if (userSession.role === "AGENT") {
            isAgent = true;
          }
        }
      }
    } catch (e) { isAdmin = false; }

    return NextResponse.json({ 
      ...config, 
      auditLogs: logs, 
      isAdmin,
      isBankAdmin,
      isBusinessAdmin,
      isAgent,
      stats: {
        totalUsers,
        activeSessions,
        piVolume24h: 314.15 // Tu pourras lier cela à une agrégation de transactions plus tard
      }
    });
  } catch (error: any) {
    // When the database is unreachable return safe defaults instead of a 500
    // so that client components (GlobalAnnouncement, GlobalAlert) keep working.
    console.error("GET_CONFIG_ERROR:", error);
    return NextResponse.json(FALLBACK_CONFIG);
  }
}

// --- POST : CENTRE DE COMMANDE ACTIONS ADMIN ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // AUTO-RESUME: No admin auth needed - server validates time expiry
    if (action === "AUTO_RESUME") {
      const current = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      if (current?.maintenanceMode && current?.maintenanceUntil) {
        const now = new Date();
        const until = new Date(current.maintenanceUntil);
        if (now >= until) {
          const resumed = await ConfigModel.update({
            where: { id: "GLOBAL_CONFIG" },
            data: { maintenanceMode: false, maintenanceUntil: null }
          });
          await prisma.auditLog.create({
            data: {
              adminName: "SYSTEM",
              action: "AUTO_RESUME_MAINTENANCE",
              details: "Maintenance desactivee automatiquement apres expiration du delai."
            }
          }).catch(() => null);
          return NextResponse.json(resumed);
        }
      }
      return NextResponse.json({ error: "Maintenance encore active" }, { status: 400 });
    }

    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse - Protocole Elara" }, { status: 403 });
    }

    // 1. ACTION : REINITIALISATION (Password/Pin)
    if (action === "RESET_PASSWORD" || action === "RESET_PIN") {
      const { userId, newSecret } = body;
      if (!userId || !newSecret) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

      const hashedSecret = await bcrypt.hash(newSecret, 10);
      const updateData = action === "RESET_PASSWORD"
        ? { password: hashedSecret }
        : { pin: hashedSecret }; // Corrigé selon ton schéma 'pin'

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          adminName: adminSession.email || "Admin",
          action: action,
          details: `Réinitialisation de sécurité pour l'utilisateur ${userId}`
        }
      });

      return NextResponse.json({ message: "Réinitialisation réussie" });
    }

    // 2. ACTION : TOGGLE SPECIFIQUE (Maintenance ou Coming Soon)
    if (action === "TOGGLE_MODE") {
      const { modeType } = body; // 'maintenanceMode' ou 'comingSoonMode'
      const current = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      
      const updated = await ConfigModel.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { [modeType]: !current?.[modeType as keyof typeof current] }
      });

      return NextResponse.json(updated);
    }

    // 3. ACTION PAR DÉFAUT : SYNC CORE (Mise à jour globale depuis ton formulaire)
    const {
      appVersion, globalAnnouncement, transactionFee,
      maintenanceMode, comingSoonMode, minWithdrawal, 
      consensusPrice, stakingAPY, forceUpdate, maintenanceUntil,
      // Crypto fee fields
      transferFee, withdrawFee, depositCryptoFee, exchangeFee,
      // Fiat fee fields
      depositMobileFee, depositCardFee, withdrawMobileFee, withdrawBankFee, fiatTransferFee,
      // Payment fee fields
      cardPaymentFee, merchantPaymentFee, billPaymentFee, qrPaymentFee,
      // Limits
      maxWithdrawal,
      // Referral bonus
      referralBonus, referralWelcomeBonus
    } = body;

    // Build update data, handling maintenanceUntil properly
    const updateData: any = {};
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
    if (maintenanceUntil !== undefined) updateData.maintenanceUntil = maintenanceUntil ? new Date(maintenanceUntil) : null;
    // When disabling maintenance, also clear the until date
    if (maintenanceMode === false) updateData.maintenanceUntil = null;
    // Crypto fee fields
    if (transferFee !== undefined) updateData.transferFee = Number(transferFee);
    if (withdrawFee !== undefined) updateData.withdrawFee = Number(withdrawFee);
    if (depositCryptoFee !== undefined) updateData.depositCryptoFee = Number(depositCryptoFee);
    if (exchangeFee !== undefined) updateData.exchangeFee = Number(exchangeFee);
    // Fiat fee fields
    if (depositMobileFee !== undefined) updateData.depositMobileFee = Number(depositMobileFee);
    if (depositCardFee !== undefined) updateData.depositCardFee = Number(depositCardFee);
    if (withdrawMobileFee !== undefined) updateData.withdrawMobileFee = Number(withdrawMobileFee);
    if (withdrawBankFee !== undefined) updateData.withdrawBankFee = Number(withdrawBankFee);
    if (fiatTransferFee !== undefined) updateData.fiatTransferFee = Number(fiatTransferFee);
    // Payment fee fields
    if (cardPaymentFee !== undefined) updateData.cardPaymentFee = Number(cardPaymentFee);
    if (merchantPaymentFee !== undefined) updateData.merchantPaymentFee = Number(merchantPaymentFee);
    if (billPaymentFee !== undefined) updateData.billPaymentFee = Number(billPaymentFee);
    if (qrPaymentFee !== undefined) updateData.qrPaymentFee = Number(qrPaymentFee);
    // Referral bonus fields
    if (referralBonus !== undefined) updateData.referralBonus = Number(referralBonus);
    if (referralWelcomeBonus !== undefined) updateData.referralWelcomeBonus = Number(referralWelcomeBonus);

    const updatedConfig = await ConfigModel.update({
      where: { id: "GLOBAL_CONFIG" },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        adminName: adminSession.email || "Admin",
        action: "UPDATE_SYSTEM_CONFIG",
        details: `Synchronisation noyau v${appVersion} effectuée.`
      }
    });

    return NextResponse.json(updatedConfig);

  } catch (error: any) {
    console.error("ADMIN_POST_ERROR:", error);
    return NextResponse.json({ error: "Échec de l'opération noyau" }, { status: 500 });
  }
}
