export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    const requesterId = await getAuthUserId();
    if (!requesterId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    const body = await req.json();
    const { targetUserId, action, method, code } = body as { targetUserId?: string; action?: string; method?: string; code?: string };
    if (!targetUserId || !["FREEZE", "UNFREEZE"].includes(action || "") || !["totp", "pin"].includes(method || "") || typeof code !== "string") return NextResponse.json({ error: "Demande invalide" }, { status: 400 });

    const admin = await prisma.user.findUnique({ where: { id: requesterId }, select: { id: true, role: true, pin: true, twoFactorEnabled: true, twoFactorSecret: true } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (targetUserId === requesterId) return NextResponse.json({ error: "Un administrateur ne peut pas désactiver son propre compte" }, { status: 400 });

    const valid = method === "pin" ? Boolean(admin.pin && /^\d{4,6}$/.test(code) && await bcrypt.compare(code, admin.pin)) : Boolean(admin.twoFactorEnabled && admin.twoFactorSecret && /^\d{6}$/.test(code) && verifyTotp(admin.twoFactorSecret, code));
    if (!valid) return NextResponse.json({ error: method === "pin" ? "PIN administrateur incorrect" : "Code Google Authenticator incorrect" }, { status: 403 });

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, status: true } });
    if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const nextStatus = action === "FREEZE" ? "FROZEN" : "ACTIVE";
    await prisma.$transaction([
      prisma.user.update({ where: { id: targetUserId }, data: { status: nextStatus, statusReason: action === "FREEZE" ? "Désactivé par un administrateur" : null } }),
      prisma.auditLog.create({ data: { adminId: requesterId, adminName: "Administration", action: action === "FREEZE" ? "USER_ACCOUNT_DISABLED" : "USER_ACCOUNT_REACTIVATED", details: `Compte ${targetUserId}: ${target.status} -> ${nextStatus}`, targetId: targetUserId } }),
    ]);
    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("ADMIN_ACCOUNT_STATUS_ERROR", error);
    return NextResponse.json({ error: "Erreur lors de la modification du compte" }, { status: 500 });
  }
}
