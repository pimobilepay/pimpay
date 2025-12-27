import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. VÉRIFICATION DE SÉCURITÉ (ADMIN SEULEMENT)
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const requester = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, amount, extraData, userIds } = body;

    // 2. LOGIQUE DES ACTIONS
    switch (action) {
      // --- NOUVEAU : GESTION SÉCURITÉ (PIN & PASSWORD) ---
      case "RESET_PIN":
        if (!extraData) return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
        const hashedPin = await bcrypt.hash(extraData, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { pinCode: hashedPin }, // Assure-toi que le champ est pinCode
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

      // --- NOUVEAU : MAINTENANCE INDIVIDUELLE & AUTO-APPROVE ---
      case "USER_SPECIFIC_MAINTENANCE":
        if (!extraData) return NextResponse.json({ error: "Date requise" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: { maintenanceUntil: new Date(extraData) },
        });
        break;

      case "TOGGLE_AUTO_APPROVE":
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { autoApprove: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { autoApprove: !u?.autoApprove },
        });
        break;

      // --- GESTION DES TRANSACTIONS & RETRAITS ---
      case "APPROVE_WITHDRAW":
        const txToApprove = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAW" },
          orderBy: { createdAt: "desc" },
        });
        if (!txToApprove) return NextResponse.json({ error: "Aucun retrait en attente" }, { status: 404 });
        await prisma.transaction.update({
          where: { id: txToApprove.id },
          data: { status: "COMPLETED" },
        });
        break;

      case "REJECT_WITHDRAW":
        const txToReject = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAW" },
          orderBy: { createdAt: "desc" },
        });
        if (!txToReject) return NextResponse.json({ error: "Aucun retrait en attente" }, { status: 404 });
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: txToReject.id },
            data: { status: "FAILED", note: extraData || "Rejeté par l'administration" },
          }),
          prisma.wallet.updateMany({
            where: { userId: userId, currency: "PI" },
            data: { balance: { increment: txToReject.amount } },
          }),
        ]);
        break;

      // --- GESTION DES UTILISATEURS & STATUTS ---
      case "BAN":
      case "UNBAN":
        await prisma.user.update({
          where: { id: userId },
          data: { status: action === "BAN" ? "BANNED" : "ACTIVE" },
        });
        break;

      case "FREEZE":
        await prisma.user.update({
          where: { id: userId },
          data: { status: "FROZEN" },
        });
        break;

      case "UPDATE_BALANCE":
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        // Utilisation de updateMany pour éviter l'erreur si l'index composé n'existe pas exactement
        await prisma.wallet.updateMany({
          where: { userId: userId, currency: "PI" },
          data: { balance: amount }, // On remplace le solde comme demandé par le prompt admin
        });
        break;

      case "TOGGLE_ROLE":
        const target = await prisma.user.findUnique({ where: { id: userId } });
        const roles: ("USER" | "MERCHANT" | "AGENT" | "ADMIN")[] = ["USER", "MERCHANT", "AGENT", "ADMIN"];
        const nextRole = roles[(roles.indexOf(target?.role || "USER") + 1) % roles.length];
        await prisma.user.update({
          where: { id: userId },
          data: { role: nextRole },
        });
        break;

      // --- CONFIGURATION SYSTÈME ---
      case "TOGGLE_MAINTENANCE":
        const currentConfig = await prisma.systemConfig.findFirst();
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: !currentConfig?.maintenanceMode },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true },
        });
        break;

      // --- ACTIONS GROUPÉES (BATCH) ---
      case "BATCH_AIRDROP":
        if (!userIds || !amount) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: { in: userIds }, currency: "PI" },
          data: { balance: { increment: amount } },
        });
        break;

      case "BATCH_BAN":
        if (!userIds) return NextResponse.json({ error: "Utilisateurs requis" }, { status: 400 });
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: "BANNED" },
        });
        break;

      default:
        return NextResponse.json({ error: `Action '${action}' non reconnue` }, { status: 400 });
    }

    // 3. LOG D'AUDIT
    await prisma.auditLog.create({
      data: {
        adminId: requester.id,
        adminName: requester.name || requester.email || "Admin",
        action: action,
        targetId: userId || (userIds ? "BATCH_ACTION" : "SYSTEM"),
        targetEmail: extraData || (userIds ? `${userIds.length} users` : "N/A"),
      },
    }).catch(err => console.error("Audit Log Error:", err));

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API_ADMIN_ACTION_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
