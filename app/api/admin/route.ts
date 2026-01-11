export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { UserStatus, TransactionStatus, UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. VÉRIFICATION DE SÉCURITÉ
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    const requester = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, amount, extraData, userIds, transactionId } = body;

    // 2. LOGIQUE DES ACTIONS
    switch (action) {
      case "VALIDATE_DEPOSIT":
        if (!transactionId) return NextResponse.json({ error: "ID Transaction requis" }, { status: 400 });

        const tx = await prisma.transaction.findUnique({
          where: { id: transactionId },
        });

        if (!tx || tx.status !== "PENDING") {
          return NextResponse.json({ error: "Transaction invalide" }, { status: 400 });
        }

        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: "COMPLETED" }
          }),
          prisma.wallet.upsert({
            where: { userId_currency: { userId: tx.fromUserId!, currency: "PI" } },
            update: { balance: { increment: tx.amount } },
            create: { userId: tx.fromUserId!, currency: "PI", balance: tx.amount },
          }),
          prisma.notification.create({
            data: {
              userId: tx.fromUserId!,
              title: "Dépôt Validé",
              message: `Votre dépôt de π ${tx.amount} a été approuvé.`,
              type: "SUCCESS"
            }
          })
        ]);
        break;

      case "SEND_NETWORK_ANNOUNCEMENT":
        if (!extraData) return NextResponse.json({ error: "Message vide" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { globalAnnouncement: extraData },
          create: { id: "GLOBAL_CONFIG", globalAnnouncement: extraData },
        });
        break;

      case "BAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } });
        break;

      case "UNBAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
        break;

      case "UPDATE_BALANCE":
        if (amount === undefined || !userId) return NextResponse.json({ error: "Données requises" }, { status: 400 });
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "PI" } },
          update: { balance: parseFloat(amount.toString()) },
          create: { userId, currency: "PI", balance: parseFloat(amount.toString()) },
        });
        break;

      case "TOGGLE_ROLE":
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { role: u?.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN }
        });
        break;

      // ... Ajoute les autres cases si nécessaire, en gardant la structure
      
      default:
        console.log("Action non reconnue:", action);
    }

    // 3. ENREGISTREMENT DANS LES LOGS D'AUDIT (FIX P2003)
    try {
      // Déterminer si targetId est un ID utilisateur valide pour respecter la FK
      // Si l'action concerne une transaction, on ne met pas l'ID dans targetId
      const isUserAction = userId && !transactionId;

      await prisma.auditLog.create({
        data: {
          adminId: requester.id,
          adminName: requester.name || requester.email || "Admin",
          action: action,
          // On ne remplit targetId QUE si c'est un User ID, sinon Prisma bloque (P2003)
          targetId: isUserAction ? userId : null,
          details: `Action: ${action} | User: ${userId || 'N/A'} | Tx: ${transactionId || 'N/A'} | Val: ${amount || extraData || ''}`,
        },
      });
    } catch (logError) {
      console.error("AuditLog Error (Ignored to prevent crash):", logError);
    }

    return NextResponse.json({ success: true, message: "Action effectuée" });

  } catch (error: any) {
    console.error("ADMIN_API_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
