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

      // MAINTENANCE SYSTÈME INSTANTANÉE
      case "TOGGLE_MAINTENANCE":
        const current = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: !current?.maintenanceMode },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true },
        });
        break;

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

      // ANNONCE RÉSEAU GLOBALE
      case "SEND_NETWORK_ANNOUNCEMENT":
        if (!extraData) return NextResponse.json({ error: "Message requis" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { globalAnnouncement: extraData },
          create: { id: "GLOBAL_CONFIG", globalAnnouncement: extraData },
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
