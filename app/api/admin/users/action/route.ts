export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. VÉRIFICATION DE SÉCURITÉ (ADMIN SEULEMENT)
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, amount, extraData, userIds } = body;

    // 2. LOGIQUE DES ACTIONS
    switch (action) {
      // --- FONCTIONNALITÉS SYSTÈME & RESEAU ---

      case "AIRDROP_ALL":
        if (!amount) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { currency: "PI" },
          data: { balance: { increment: parseFloat(amount) } },
        });
        break;

      case "SEND_NETWORK_ANNOUNCEMENT":
        if (!extraData) return NextResponse.json({ error: "Message vide" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { globalAnnouncement: extraData },
          create: { id: "GLOBAL_CONFIG", globalAnnouncement: extraData },
        });
        break;

      case "PLAN_MAINTENANCE":
        if (!extraData) return NextResponse.json({ error: "Date requise" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: {
            maintenanceMode: true,
            maintenanceUntil: new Date(extraData)
          },
          create: {
            id: "GLOBAL_CONFIG",
            maintenanceMode: true,
            maintenanceUntil: new Date(extraData)
          },
        });
        break;

      // --- GESTION SÉCURITÉ UTILISATEUR ---
      case "RESET_PIN":
        if (!extraData) return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
        // Validate PIN format (4 or 6 digits)
        if (!/^\d{4,6}$/.test(extraData)) {
          return NextResponse.json({ error: "Le PIN doit contenir 4 ou 6 chiffres" }, { status: 400 });
        }
        const hashedPin = await bcrypt.hash(extraData, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { 
            pin: hashedPin,
            pinVersion: extraData.length === 6 ? 2 : 1, // Version 2 for 6-digit PIN
          },
        });
        break;

      case "RESET_PASSWORD":
        if (!extraData) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
        const hashedPassword = await bcrypt.hash(extraData, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
        break;

      // --- GESTION DES TRANSACTIONS ---
      case "APPROVE_WITHDRAW":
        const txToApprove = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAW" },
          orderBy: { createdAt: "desc" },
        });
        if (!txToApprove) return NextResponse.json({ error: "Aucun retrait" }, { status: 404 });
        await prisma.transaction.update({
          where: { id: txToApprove.id },
          data: { status: "SUCCESS" },
        });
        break;

      case "REJECT_WITHDRAW":
        const txToReject = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAW" },
          orderBy: { createdAt: "desc" },
        });
        if (!txToReject) return NextResponse.json({ error: "Aucun retrait" }, { status: 404 });
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: txToReject.id },
            data: { status: "FAILED", note: extraData || "Rejeté par l'admin" },
          }),
          prisma.wallet.updateMany({
            where: { userId: userId, currency: "PI" },
            data: { balance: { increment: txToReject.amount } },
          }),
        ]);
        break;

      // --- STATUTS ET RÔLES ---
      case "BAN":
      case "UNBAN":
        await prisma.user.update({
          where: { id: userId },
          data: { status: action === "BAN" ? "BANNED" : "ACTIVE" },
        });
        break;

      case "FREEZE":
      case "UNFREEZE":
        await prisma.user.update({
          where: { id: userId },
          data: { status: action === "FREEZE" ? "FROZEN" : "ACTIVE" },
        });
        break;

      case "TOGGLE_ROLE":
      case "SET_ROLE": {
        const validRoles = ["ADMIN", "USER", "MERCHANT", "AGENT"];
        if (extraData && validRoles.includes(extraData.toUpperCase())) {
          await prisma.user.update({
            where: { id: userId },
            data: { role: extraData.toUpperCase() as any },
          });
        } else {
          const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
          const roleOrder = ["USER", "AGENT", "MERCHANT", "ADMIN"];
          const currentIdx = roleOrder.indexOf(targetUser?.role || "USER");
          const nextRole = roleOrder[(currentIdx + 1) % roleOrder.length];
          await prisma.user.update({
            where: { id: userId },
            data: { role: nextRole as any },
          });
        }
        break;
      }

      case "AIRDROP":
        if (!amount) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: userId, currency: "PI" },
          data: { balance: { increment: parseFloat(amount) } },
        });
        break;

      case "UPDATE_BALANCE":
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: userId, currency: "PI" },
          data: { balance: parseFloat(amount) },
        });
        break;

      case "TOGGLE_MAINTENANCE":
        const currentConfig = await prisma.systemConfig.findFirst();
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: !currentConfig?.maintenanceMode },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true },
        });
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

      // --- KYC APPROVAL ---
      case "APPROVE_KYC":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: "APPROVED" }
        });
        break;

      // --- DELETE USER ---
      case "DELETE_USER":
        if (!userId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        
        // Delete in correct order to respect foreign key constraints
        await prisma.$transaction([
          // Delete user sessions
          prisma.userSession.deleteMany({ where: { userId } }),
          // Delete transactions where user is sender or receiver
          prisma.transaction.deleteMany({ 
            where: { 
              OR: [
                { fromUserId: userId },
                { toUserId: userId }
              ]
            } 
          }),
          // Delete wallets
          prisma.wallet.deleteMany({ where: { userId } }),
          // Delete notifications
          prisma.notification.deleteMany({ where: { userId } }),
          // Delete audit logs targeting this user
          prisma.auditLog.deleteMany({ where: { targetId: userId } }),
          // Finally delete the user
          prisma.user.delete({ where: { id: userId } })
        ]);
        break;

      // --- ACTIONS BATCH (GROUPÉES) ---
      case "BATCH_AIRDROP":
        if (!userIds || !amount) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: { in: userIds }, currency: "PI" },
          data: { balance: { increment: parseFloat(amount) } },
        });
        break;

      default:
        // On laisse le switch gérer les autres cas existants sans changement
        break;
    }

    // 3. LOG D'AUDIT SÉCURISÉ (Fix P2003)
    try {
      // Vérification : l'ID doit être un UUID/CUID valide présent en base pour targetId
      // Si c'est "SYSTEM" ou un "BATCH", on met targetId à null pour respecter la FK
      const isValidUserTarget = userId && userId !== "SYSTEM" && userId !== "BATCH_ACTION";

      await prisma.auditLog.create({
        data: {
          adminId: requester.id,
          adminName: requester.name || requester.email || "Admin",
          action: action,
          targetId: isValidUserTarget ? userId : null,
          details: `Action: ${action} | Target: ${userId || (userIds ? userIds.length + ' users' : 'SYSTEM')} | Data: ${extraData || amount || 'N/A'}`,
        },
      });
    } catch (auditErr) {
      console.error("Audit Log Ignored (P2003 Prevented):", auditErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API_ADMIN_ACTION_ERROR:", error);
    if (error.code === 'P1001') {
      return NextResponse.json({ error: "Base de données en réveil (Neon). Réessayez." }, { status: 503 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
