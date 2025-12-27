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
          prisma.wallet.update({
            where: { userId: userId, currency: "PI" },
            data: { balance: { increment: txToReject.amount } },
          }),
        ]);
        break;

      // --- GESTION DES CARTES VIRTUELLES ---
      case "TOGGLE_CARD_LOCK":
        const card = await prisma.virtualCard.findFirst({ where: { userId } });
        if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
        await prisma.virtualCard.update({
          where: { id: card.id },
          data: { locked: !card.locked },
        });
        break;

      case "DELETE_CARD":
        await prisma.virtualCard.deleteMany({ where: { userId } });
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

      case "SUSPEND":
        await prisma.user.update({
          where: { id: userId },
          data: { status: "SUSPENDED" },
        });
        break;

      case "UPDATE_BALANCE":
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        await prisma.wallet.update({
          where: { userId_currency: { userId, currency: "PI" } },
          data: { balance: { increment: amount } },
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

      case "SET_CONSENSUS_PRICE":
        if (!amount) return NextResponse.json({ error: "Prix requis" }, { status: 400 });
        await prisma.systemConfig.update({
          where: { id: "GLOBAL_CONFIG" },
          data: { consensusPrice: amount },
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

      case "VERIFY_KYC":
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: "VERIFIED", status: "ACTIVE", kycVerifiedAt: new Date() },
        });
        break;

      default:
        return NextResponse.json({ error: `Action '${action}' non implémentée` }, { status: 400 });
    }

    // 3. LOG D'AUDIT
    await prisma.auditLog.create({
      data: {
        adminId: requester.id,
        adminName: requester.name || requester.email,
        action: action,
        targetId: userId || null,
        targetEmail: userId || (userIds ? `${userIds.length} users` : "SYSTEM"),
        createdAt: new Date(),
      },
    }).catch(err => console.error("Audit Log Error:", err));

    return NextResponse.json({ success: true, message: `Action ${action} exécutée avec succès` });

  } catch (error: any) {
    console.error("API_ADMIN_ACTION_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur lors de l'action admin." }, { status: 500 });
  }
}
