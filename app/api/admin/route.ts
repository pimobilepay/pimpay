import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { UserStatus, TransactionStatus, UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. VÉRIFICATION DE SÉCURITÉ (ADMIN SEULEMENT)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const requester = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé : Droits insuffisants" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, amount, extraData, userIds, transactionId } = body;

    // 2. LOGIQUE DES ACTIONS
    switch (action) {
      // --- NOUVEAUTÉ : APPROBATION KYC ---
      case "APPROVE_KYC":
        if (!userId) return NextResponse.json({ error: "ID Utilisateur requis" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: 'VERIFIED' } 
        });
        // Notification automatique
        await prisma.notification.create({
          data: {
            userId: userId,
            title: "KYC Validé",
            message: "Votre identité a été vérifiée par l'administration.",
            type: "SUCCESS"
          }
        });
        break;

      // --- NOUVEAUTÉ : VALIDATION DÉPÔT CRYPTO ---
      case "VALIDATE_DEPOSIT":
        if (!transactionId || !amount) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        
        // On utilise une transaction Prisma pour garantir l'intégrité
        await prisma.$transaction(async (tx) => {
          const depositTx = await tx.transaction.findUnique({
            where: { id: transactionId },
            include: { fromUser: true }
          });

          if (!depositTx || depositTx.status !== "PENDING") {
            throw new Error("Transaction introuvable ou déjà traitée");
          }

          // Mettre à jour la transaction
          await tx.transaction.update({
            where: { id: transactionId },
            data: { 
              status: TransactionStatus.SUCCESS, 
              amount: parseFloat(amount.toString()) 
            }
          });

          // Créditer le portefeuille de l'utilisateur
          await tx.wallet.updateMany({
            where: { userId: depositTx.fromUserId, currency: "PI" },
            data: { balance: { increment: parseFloat(amount.toString()) } }
          });

          // Notifier l'utilisateur
          await tx.notification.create({
            data: {
              userId: depositTx.fromUserId,
              title: "Dépôt Confirmé",
              message: `Votre dépôt de ${amount} π a été crédité.`,
              type: "SUCCESS"
            }
          });
        });
        break;

      // --- SYSTÈME & MAINTENANCE ---
      case "TOGGLE_MAINTENANCE":
        const currentConfig = await prisma.systemConfig.findFirst();
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: !currentConfig?.maintenanceMode },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true },
        });
        break;

      case "PLAN_MAINTENANCE":
        if (!extraData) return NextResponse.json({ error: "Date de fin requise" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: true, maintenanceUntil: new Date(extraData) },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true, maintenanceUntil: new Date(extraData) },
        });
        break;

      case "SEND_NETWORK_ANNOUNCEMENT":
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { globalAnnouncement: extraData },
          create: { id: "GLOBAL_CONFIG", globalAnnouncement: extraData },
        });
        break;

      // --- ACTIONS UTILISATEUR (INDIVIDUEL) ---
      case "BAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } });
        break;

      case "ACTIVATE":
      case "UNBAN":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
        break;

      case "FREEZE":
        await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.FROZEN } });
        break;

      case "TOGGLE_AUTO_APPROVE":
        const userToToggle = await prisma.user.findUnique({ where: { id: userId }, select: { autoApprove: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { autoApprove: !userToToggle?.autoApprove }
        });
        break;

      case "TOGGLE_ROLE":
        const userRole = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { role: userRole?.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN }
        });
        break;

      case "RESET_PIN":
        if (!extraData) return NextResponse.json({ error: "PIN requis" }, { status: 400 });
        const hashedPin = await bcrypt.hash(extraData.toString(), 10);
        await prisma.user.update({ where: { id: userId }, data: { pin: hashedPin } });
        break;

      case "RESET_PASSWORD":
        if (!extraData) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
        const hashedPass = await bcrypt.hash(extraData.toString(), 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hashedPass } });
        break;

      // --- FINANCES & WALLETS ---
      case "UPDATE_BALANCE":
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "PI" } },
          update: { balance: parseFloat(amount.toString()) },
          create: { userId, currency: "PI", balance: parseFloat(amount.toString()) },
        });
        break;

      case "AIRDROP_ALL":
        if (!amount) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { currency: "PI" },
          data: { balance: { increment: parseFloat(amount.toString()) } },
        });
        break;

      // --- ACTIONS GROUPÉES (BATCH) ---
      case "BATCH_AIRDROP":
        if (!userIds || !amount) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: { in: userIds }, currency: "PI" },
          data: { balance: { increment: parseFloat(amount.toString()) } }
        });
        break;

      case "BATCH_BAN":
        if (!userIds) return NextResponse.json({ error: "Aucun utilisateur sélectionné" }, { status: 400 });
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: UserStatus.BANNED }
        });
        break;

      default:
        return NextResponse.json({ error: `Action '${action}' non implémentée` }, { status: 400 });
    }

    // 3. ENREGISTREMENT DANS LES LOGS D'AUDIT
    try {
      const isBatch = action.startsWith("BATCH_") || action === "AIRDROP_ALL";
      await prisma.auditLog.create({
        data: {
          adminId: requester.id,
          adminName: requester.name || requester.email || "Admin",
          action: action,
          targetId: isBatch ? null : (userId || transactionId),
          details: `Action: ${action} | Valeur: ${amount || extraData || 'N/A'}`,
        },
      });
    } catch (logError) {
      console.error("Erreur AuditLog:", logError);
    }

    return NextResponse.json({ success: true, message: "Action effectuée avec succès" });

  } catch (error: any) {
    console.error("CRITICAL_ADMIN_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
