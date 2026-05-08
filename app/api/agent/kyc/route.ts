/**
 * app/api/agent/kyc/route.ts
 * API KYC réservée aux agents SUPERVISOR.
 * - GET  : liste les utilisateurs KYC en attente
 * - POST : approuve ou rejette un KYC
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { grantReferrerBonusIfEligible } from "@/app/api/referral/route";

/** Vérifie que l'utilisateur est bien un agent SUPERVISOR */
async function supervisorAuth(req: NextRequest) {
  const authUser = await verifyAuth(req) as any;
  if (!authUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true, agentRole: true, name: true, username: true },
  });

  if (!user) return null;
  if (user.role !== "AGENT" && user.role !== "ADMIN") return null;
  // Un ADMIN peut toujours accéder ; un AGENT doit avoir agentRole = SUPERVISOR
  if (user.role === "AGENT" && user.agentRole !== "SUPERVISOR") return null;

  return user;
}

// ─── GET : liste KYC en attente ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const agent = await supervisorAuth(req);
  if (!agent) {
    return NextResponse.json(
      { error: "Accès réservé aux superviseurs agents" },
      { status: 403 }
    );
  }

  try {
    const pendingUsers = await prisma.user.findMany({
      where: { kycStatus: "PENDING" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        address: true,
        birthDate: true,
        gender: true,
        idType: true,
        idNumber: true,
        idExpiryDate: true,
        kycFrontUrl: true,
        kycBackUrl: true,
        kycSelfieUrl: true,
        kycSubmittedAt: true,
        kycStatus: true,
      },
      orderBy: { kycSubmittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: pendingUsers });
  } catch (error) {
    console.error("[AGENT_KYC_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST : approuver ou rejeter un KYC ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const agent = await supervisorAuth(req);
  if (!agent) {
    return NextResponse.json(
      { error: "Accès réservé aux superviseurs agents" },
      { status: 403 }
    );
  }

  try {
    const { userId, status, reason } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: status === "APPROVED" ? "VERIFIED" : "REJECTED",
        kycVerifiedAt: status === "APPROVED" ? new Date() : null,
        kycReason: status === "REJECTED" ? (reason || "Rejeté par superviseur agent") : null,
      },
    });

    // Accorder bonus parrainage si KYC approuvé
    if (status === "APPROVED") {
      await grantReferrerBonusIfEligible(userId);
    }

    // Log de l'action
    await prisma.auditLog.create({
      data: {
        adminId: agent.id,
        adminName: agent.name || agent.username || "Superviseur",
        action: status === "APPROVED" ? "KYC_APPROVED_BY_SUPERVISOR" : "KYC_REJECTED_BY_SUPERVISOR",
        details: JSON.stringify({ userId, status, reason, supervisorId: agent.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: status === "APPROVED" ? "KYC approuvé avec succès" : "KYC rejeté",
      user: { id: updatedUser.id, kycStatus: updatedUser.kycStatus },
    });
  } catch (error) {
    console.error("[AGENT_KYC_POST]", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
