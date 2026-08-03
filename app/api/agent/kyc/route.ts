/**
 * app/api/agent/kyc/route.ts
 * API KYC réservée aux agents SUPERVISOR.
 * - GET  : liste les utilisateurs KYC en attente
 * - POST : approuve ou rejette un KYC
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import { getOrCreateKycTicket, buildUserDisplayName } from "@/lib/kyc-ticket";

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

    // Flux à deux niveaux :
    //  - Le superviseur PRÉ-VALIDE un dossier -> statut "APPROVED"
    //    (le KYC n'est PAS encore actif ; il attend la validation finale de l'admin)
    //  - Le superviseur peut rejeter -> statut "REJECTED"
    // La validation finale (statut "VERIFIED") et le bonus de parrainage
    // sont accordés uniquement par l'administrateur (voir /api/admin/kyc/verify).
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: status === "APPROVED" ? "APPROVED" : "REJECTED",
        kycReason: status === "REJECTED" ? (reason || "Rejeté par superviseur agent") : null,
      },
    });

    // Notifier l'utilisateur du résultat de la pré-validation
    try {
      const kycTicket = await getOrCreateKycTicket(userId);
      const displayName = buildUserDisplayName(updatedUser);
      const decidedAt = new Date().toISOString();
      const baseMeta = {
        ticket: kycTicket,
        reference: kycTicket,
        decidedAt,
        userName: displayName,
        userAvatar: updatedUser.avatar || undefined,
      };

      if (status === "APPROVED") {
        await sendNotification({
          userId,
          title: "Vérification d'identité pré-validée",
          message: `Bonjour ${displayName}, votre dossier d'identité a été pré-validé par un superviseur. Il est maintenant en attente de la validation finale de l'administration.`,
          type: "KYC_PENDING",
          metadata: { ...baseMeta, status: "PENDING" },
        });
      } else {
        await sendNotification({
          userId,
          title: "Vérification d'identité refusée",
          message: reason
            ? `Bonjour ${displayName}, votre vérification d'identité a été refusée. Motif : ${reason}. Veuillez soumettre à nouveau votre dossier.`
            : `Bonjour ${displayName}, votre vérification d'identité a été refusée. Veuillez soumettre à nouveau votre dossier.`,
          type: "KYC_REJECTED",
          metadata: { ...baseMeta, status: "REJECTED", reason: reason || undefined },
        });
      }
    } catch (notifErr) {
      console.error("[AGENT_KYC_NOTIFY]", notifErr);
    }

    // Log de l'action
    await prisma.auditLog.create({
      data: {
        adminId: agent.id,
        adminName: agent.name || agent.username || "Superviseur",
        action: status === "APPROVED" ? "KYC_PREVALIDATED_BY_SUPERVISOR" : "KYC_REJECTED_BY_SUPERVISOR",
        details: JSON.stringify({ userId, status, reason, supervisorId: agent.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "KYC pré-validé — en attente de validation finale par l'administration"
          : "KYC rejeté",
      user: { id: updatedUser.id, kycStatus: updatedUser.kycStatus },
    });
  } catch (error) {
    console.error("[AGENT_KYC_POST]", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
