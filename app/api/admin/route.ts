export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { UserStatus, UserRole } from "@prisma/client";

/**
 * API ADMINISTRATIVE PIMPAY CORE
 * Gère les utilisateurs, la finance et la configuration système.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION & SÉCURITÉ
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    // Vérification de l'existence et du rôle de l'admin
    const requester = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Privilèges insuffisants" }, { status: 403 });
    }

    // 2. EXTRACTION ET PARSING DU BODY
    const body = await req.json();
    const { userId, action, amount, extraData, transactionId, newSecret, userIds } = body;

    if (!action) return NextResponse.json({ error: "Action manquante" }, { status: 400 });

    // 3. LOGIQUE DES ACTIONS (Basée sur le Schéma Prisma)
    switch (action) {
      
      // RÉINITIALISATION MOT DE PASSE
      case "RESET_PASSWORD":
        if (!userId || !newSecret) return NextResponse.json({ error: "ID ou secret manquant" }, { status: 400 });
        const hashedPw = await bcrypt.hash(newSecret, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPw }
        });
        break;

      // RÉINITIALISATION CODE PIN (Corrigé selon ton Schéma: champ "pin")
      case "RESET_PIN":
        if (!userId || !newSecret) return NextResponse.json({ error: "ID ou PIN manquant" }, { status: 400 });
        const hashedPin = await bcrypt.hash(newSecret, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { pin: hashedPin } // Utilise le champ 'pin' défini dans ton Prisma
        });
        break;

      // MAINTENANCE SYSTÈME INSTANTANÉE (via cookie + SystemConfig DB)
      case "TOGGLE_MAINTENANCE": {
        const isCurrentlyInMaintenance = cookieStore.get("maintenance_mode")?.value === "true";
        const response = NextResponse.json({ success: true, message: isCurrentlyInMaintenance ? "Maintenance désactivée" : "Maintenance activée" });
        if (isCurrentlyInMaintenance) {
          response.cookies.delete("maintenance_mode");
        } else {
          response.cookies.set("maintenance_mode", "true", {
            path: "/", httpOnly: false, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
          });
        }
        // Sync avec la DB SystemConfig
        try {
          await prisma.systemConfig.upsert({
            where: { id: "GLOBAL_CONFIG" },
            update: { maintenanceMode: !isCurrentlyInMaintenance },
            create: { id: "GLOBAL_CONFIG", maintenanceMode: !isCurrentlyInMaintenance },
          });
          await prisma.auditLog.create({
            data: {
              adminId: requester.id,
              adminName: requester.name || requester.email || "Système",
              action: "TOGGLE_MAINTENANCE",
              details: isCurrentlyInMaintenance ? "Maintenance désactivée" : "Maintenance activée",
            }
          });
        } catch (_) {}
        return response;
      }

      // VALIDATION DE DÉPÔT / RETRAIT
      case "VALIDATE_DEPOSIT":
        if (!transactionId) return NextResponse.json({ error: "ID Transaction requis" }, { status: 400 });
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!tx || tx.status !== "PENDING") {
          return NextResponse.json({ error: "Transaction introuvable ou déjà traitée" }, { status: 400 });
        }

        // Transaction atomique pour éviter les erreurs de solde
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: "COMPLETED" }
          }),
          prisma.wallet.upsert({
            where: { userId_currency: { userId: tx.fromUserId!, currency: tx.currency } },
            update: { balance: { increment: tx.amount } },
            create: { userId: tx.fromUserId!, currency: tx.currency, balance: tx.amount },
          }),
          prisma.notification.create({
            data: {
              userId: tx.fromUserId!,
              title: "Transaction Approuvée",
              message: `Votre opération de ${tx.amount} ${tx.currency} a été validée.`,
              type: "SUCCESS"
            }
          })
        ]);
        break;

      // AJUSTEMENT MANUEL DE SOLDE
      case "UPDATE_BALANCE":
        if (!userId || amount === undefined) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "PI" } },
          update: { balance: parseFloat(amount.toString()) },
          create: { userId, currency: "PI", balance: parseFloat(amount.toString()) },
        });
        break;

      // GESTION DU STATUT UTILISATEUR
      case "BAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } });
        break;

      case "UNBAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
        break;

      case "FREEZE":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.FROZEN } });
        break;

      // CHANGEMENT DE RÔLE (ADMIN/USER)
      case "TOGGLE_ROLE":
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { role: target?.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN }
        });
        break;

      // ANNONCE RÉSEAU GLOBALE (mise à jour config + notification à tous)
      case "SEND_NETWORK_ANNOUNCEMENT":
        if (!extraData) return NextResponse.json({ error: "Message requis" }, { status: 400 });
        if (userId) {
          // Message privé pour un seul utilisateur
          await prisma.notification.create({
            data: {
              userId,
              title: "Message de l'administration",
              message: extraData,
              type: "ADMIN",
            }
          });
        } else {
          // Annonce globale à tous les utilisateurs
          const allUsers = await prisma.user.findMany({ select: { id: true } });
          if (allUsers.length > 0) {
            await prisma.notification.createMany({
              data: allUsers.map(u => ({
                userId: u.id,
                title: "Annonce PimPay",
                message: extraData,
                type: "ANNOUNCEMENT",
              })),
              skipDuplicates: true,
            });
          }
        }
        break;

      // APPROBATION KYC
      case "APPROVE_KYC":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: "VERIFIED",
            kycVerifiedAt: new Date(),
          }
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "KYC Approuvé",
            message: "Votre vérification d'identité a été approuvée avec succès.",
            type: "SUCCESS",
          }
        });
        break;

      // REJET KYC
      case "REJECT_KYC":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: "REJECTED",
            kycReason: extraData || "Rejeté par l'administrateur",
          }
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "KYC Rejeté",
            message: extraData || "Votre vérification d'identité a été refusée. Veuillez soumettre de nouveaux documents.",
            type: "WARNING",
          }
        });
        break;

      // DÉGEL DU COMPTE
      case "UNFREEZE":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
        break;

      // MAINTENANCE INDIVIDUELLE POUR UN UTILISATEUR SPÉCIFIQUE
      case "USER_SPECIFIC_MAINTENANCE":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        const maintenanceUntil = extraData || new Date(Date.now() + 3600000).toISOString();
        await prisma.user.update({
          where: { id: userId },
          data: { status: UserStatus.SUSPENDED }
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "Compte en maintenance",
            message: `Votre compte est temporairement en maintenance jusqu'au ${new Date(maintenanceUntil).toLocaleString("fr-FR")}.`,
            type: "WARNING",
            metadata: { maintenanceUntil }
          }
        });
        break;

      // PLANIFICATION MAINTENANCE GLOBALE
      case "PLAN_MAINTENANCE":
        if (!extraData) return NextResponse.json({ error: "Date requise" }, { status: 400 });
        // Stocke la date de maintenance planifiée dans la config globale
        const allUsersForMaint = await prisma.user.findMany({ select: { id: true } });
        if (allUsersForMaint.length > 0) {
          await prisma.notification.createMany({
            data: allUsersForMaint.map(u => ({
              userId: u.id,
              title: "Maintenance planifiée",
              message: `Une maintenance est programmée pour le ${new Date(extraData).toLocaleString("fr-FR")}.`,
              type: "WARNING",
            })),
            skipDuplicates: true,
          });
        }
        break;

      // AIRDROP INDIVIDUEL
      case "AIRDROP":
        if (!userId || !amount) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "PI" } },
          update: { balance: { increment: amount } },
          create: { userId, currency: "PI", balance: amount },
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "Airdrop reçu",
            message: `Vous avez reçu un airdrop de ${amount} PI.`,
            type: "SUCCESS",
          }
        });
        break;

      // AIRDROP GLOBAL
      case "AIRDROP_ALL": {
        if (!amount) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        const allUsersForDrop = await prisma.user.findMany({ select: { id: true } });
        for (const u of allUsersForDrop) {
          await prisma.wallet.upsert({
            where: { userId_currency: { userId: u.id, currency: "PI" } },
            update: { balance: { increment: amount } },
            create: { userId: u.id, currency: "PI", balance: amount },
          });
        }
        if (allUsersForDrop.length > 0) {
          await prisma.notification.createMany({
            data: allUsersForDrop.map(u => ({
              userId: u.id,
              title: "Airdrop Global",
              message: `Un airdrop de ${amount} PI a été distribué à tous les utilisateurs.`,
              type: "SUCCESS",
            })),
            skipDuplicates: true,
          });
        }
        break;
      }

      // BATCH BAN
      case "BATCH_BAN":
        if (!userIds || userIds.length === 0) return NextResponse.json({ error: "Aucun utilisateur sélectionné" }, { status: 400 });
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: UserStatus.BANNED }
        });
        break;

      // BATCH AIRDROP
      case "BATCH_AIRDROP":
        if (!userIds || userIds.length === 0 || !amount) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        for (const uid of userIds) {
          await prisma.wallet.upsert({
            where: { userId_currency: { userId: uid, currency: "PI" } },
            update: { balance: { increment: amount } },
            create: { userId: uid, currency: "PI", balance: amount },
          });
        }
        break;

      // AUTO-APPROVE TOGGLE
      case "TOGGLE_AUTO_APPROVE":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        const userForAuto = await prisma.user.findUnique({ where: { id: userId }, select: { autoApprove: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { autoApprove: !userForAuto?.autoApprove }
        });
        break;

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

    // 4. LOG D'AUDIT (Robuste contre les erreurs de FK)
    try {
      // On vérifie si targetId existe vraiment avant de lier le log
      const targetExists = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }) : null;

      await prisma.auditLog.create({
        data: {
          adminId: requester.id,
          adminName: requester.name || requester.email || "Système",
          action: action,
          targetId: targetExists ? targetExists.id : null,
          details: `Action: ${action} | Target: ${userId || 'Global'} | Data: ${extraData || amount || 'N/A'}`
        }
      });
    } catch (logErr) {
      console.warn("AuditLog non enregistré (erreur non-bloquante)");
    }

    return NextResponse.json({ success: true, message: "Action exécutée avec succès" });

  } catch (error: any) {
    console.error("ADMIN_CRITICAL_ERROR:", error);
    
    // Gestion spécifique des timeouts de Neon/Postgres
    if (error.code === 'P2024') {
      return NextResponse.json({ error: "La base de données met trop de temps à répondre (Réveil Neon)" }, { status: 503 });
    }

    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
