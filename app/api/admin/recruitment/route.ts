export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { UserRole, UserStatus } from "@prisma/client";
import { logSystemEvent } from "@/lib/systemLogger";

// Les identifiants PMB-AGT-000001 → PMB-AGT-000099 sont réservés au staff
// technique / admin. L'attribution automatique commence donc à 100.
const AGENT_ID_RESERVED_MAX = 99;
const AGENT_ID_REGEX = /^PMB-AGT-\d{6}$/;

// ─── Helper: génère le prochain identifiant agent séquentiel (PMB-AGT-000100…) ───
// Suit le plus grand numéro déjà attribué afin de garantir l'unicité,
// tout en sautant la plage réservée au staff.
async function generateAgentId(): Promise<string> {
  const existing = await prisma.user.findMany({
    where: { agentId: { not: null } },
    select: { agentId: true },
  });
  let max = AGENT_ID_RESERVED_MAX;
  for (const a of existing) {
    const n = parseInt((a.agentId || "").replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `PMB-AGT-${String(max + 1).padStart(6, "0")}`;
}

// ─── GET: list all agent candidates (users with AGENT role or PENDING status) ───
export async function GET(req: NextRequest) {
  const payload = await adminAuth(req);
  if (!payload) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all"; // pending | active | banned | all
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  try {
    const where: Record<string, unknown> = {
      role: UserRole.AGENT,
      AND: search
        ? [
            {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
              ],
            },
          ]
        : [],
    };

    if (status !== "all") {
      where.status =
        status === "active"
          ? UserStatus.ACTIVE
          : status === "banned"
          ? UserStatus.BANNED
          : status === "pending"
          ? UserStatus.PENDING
          : status === "suspended"
          ? UserStatus.SUSPENDED
          : undefined;
    }

    const [rawAgents, total, stats, totalAgents, supervisorsCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          avatar: true,
          city: true,
          country: true,
          agentId: true,
          agentRole: true,
          status: true,
          kycStatus: true,
          createdAt: true,
          lastLoginAt: true,
          wallets: { select: { balance: true }, take: 1, orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ["status"],
        where: { role: UserRole.AGENT },
        _count: true,
      }),
      prisma.user.count({ where: { role: UserRole.AGENT } }),
      prisma.user.count({ where: { role: UserRole.AGENT, agentRole: "SUPERVISOR" } }),
    ]);

    // Normalize: expose first wallet balance as wallet.balance
    const agents = rawAgents.map(({ wallets, ...u }) => ({
      ...u,
      wallet: wallets[0] ?? null,
    }));

    const statsMap = {
      total: totalAgents,
      active: stats.find((s) => s.status === UserStatus.ACTIVE)?._count || 0,
      pending: stats.find((s) => s.status === UserStatus.PENDING)?._count || 0,
      banned: stats.find((s) => s.status === UserStatus.BANNED)?._count || 0,
      suspended: stats.find((s) => s.status === UserStatus.SUSPENDED)?._count || 0,
      supervisors: supervisorsCount,
    };

    return NextResponse.json({
      agents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: statsMap,
    });
  } catch (error) {
    console.error("[RECRUITMENT_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST: promote a USER to AGENT or create a new agent ───
export async function POST(req: NextRequest) {
  const payload = await adminAuth(req);
  if (!payload) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await req.json();
    const { action, userId, agentData } = body;

    // ACTION: promote existing user to agent
    if (action === "promote" && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

      // Attribue un identifiant agent séquentiel (PMB-AGT-000001) si l'utilisateur
      // n'en possède pas déjà un. Le numéro suit le plus grand ID déjà attribué.
      const nextAgentId = user.agentId || (await generateAgentId());

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          role: UserRole.AGENT,
          status: UserStatus.ACTIVE,
          agentId: nextAgentId,
        },
        select: { id: true, name: true, email: true, role: true, status: true, agentId: true },
      });

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "AGENT_PROMOTED",
        message: `Utilisateur ${user.email} promu agent (${nextAgentId}) par admin ${payload.id}`,
        userId: payload.id,
        details: { targetUserId: userId, previousRole: user.role, agentId: nextAgentId },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // ACTION: change agent status
    if (action === "setStatus" && userId) {
      const { newStatus, reason } = body;
      const statusMap: Record<string, UserStatus> = {
        active: UserStatus.ACTIVE,
        banned: UserStatus.BANNED,
        suspended: UserStatus.SUSPENDED,
        pending: UserStatus.PENDING,
      };
      const prismaStatus = statusMap[newStatus];
      if (!prismaStatus) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });

      // Lorsqu'un agent est activé, on lui attribue un identifiant agent
      // s'il n'en possède pas encore un.
      let assignedAgentId: string | null = null;
      if (prismaStatus === UserStatus.ACTIVE) {
        const current = await prisma.user.findUnique({
          where: { id: userId },
          select: { agentId: true },
        });
        if (current && !current.agentId) {
          assignedAgentId = await generateAgentId();
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          status: prismaStatus,
          statusReason: reason || null,
          ...(assignedAgentId ? { agentId: assignedAgentId } : {}),
        },
        select: { id: true, name: true, email: true, status: true, agentId: true },
      });

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "AGENT_STATUS_CHANGED",
        message: `Agent ${updated.email} → ${newStatus}${reason ? ` (${reason})` : ""}${assignedAgentId ? ` — ID attribué ${assignedAgentId}` : ""}`,
        userId: payload.id,
        details: { targetUserId: userId, newStatus, reason, assignedAgentId },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // ACTION: attribuer manuellement un identifiant agent
    if (action === "assignAgentId" && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, agentId: true },
      });
      if (!user) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
      if (user.agentId) {
        return NextResponse.json({ success: true, user, message: "Identifiant déjà attribué" });
      }

      const newAgentId = await generateAgentId();
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { agentId: newAgentId },
        select: { id: true, name: true, email: true, agentId: true },
      });

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "AGENT_ID_ASSIGNED",
        message: `Identifiant ${newAgentId} attribué à l'agent ${user.email} par admin ${payload.id}`,
        userId: payload.id,
        details: { targetUserId: userId, agentId: newAgentId },
      });

      return NextResponse.json({ success: true, user: updated, message: `ID attribué : ${newAgentId}` });
    }

    // ACTION: définir / modifier manuellement l'identifiant agent
    if (action === "setAgentId" && userId) {
      const raw = (body.agentId ?? "").toString().trim().toUpperCase();

      // Une valeur vide efface l'identifiant (remet à "Non attribué").
      if (!raw) {
        const cleared = await prisma.user.update({
          where: { id: userId },
          data: { agentId: null },
          select: { id: true, name: true, email: true, agentId: true },
        });
        await logSystemEvent({
          level: "WARN",
          source: "RECRUITMENT",
          action: "AGENT_ID_CLEARED",
          message: `Identifiant agent effacé pour ${cleared.email} par admin ${payload.id}`,
          userId: payload.id,
          details: { targetUserId: userId },
        });
        return NextResponse.json({ success: true, user: cleared, message: "Identifiant effacé" });
      }

      // Validation du format PMB-AGT-XXXXXX.
      if (!AGENT_ID_REGEX.test(raw)) {
        return NextResponse.json(
          { error: "Format invalide. Attendu : PMB-AGT-000000" },
          { status: 400 },
        );
      }

      // Vérifie l'unicité (hors utilisateur courant).
      const clash = await prisma.user.findFirst({
        where: { agentId: raw, id: { not: userId } },
        select: { email: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: `Identifiant déjà utilisé par ${clash.email}` },
          { status: 409 },
        );
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { agentId: raw },
        select: { id: true, name: true, email: true, agentId: true },
      });

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "AGENT_ID_SET",
        message: `Identifiant agent défini manuellement (${raw}) pour ${updated.email} par admin ${payload.id}`,
        userId: payload.id,
        details: { targetUserId: userId, agentId: raw },
      });

      return NextResponse.json({ success: true, user: updated, message: `ID mis à jour : ${raw}` });
    }

    // ACTION: changer le rôle agent (AGENT <-> SUPERVISOR)
    if (action === "setAgentRole" && userId) {
      const { newRole } = body;
      if (!["AGENT", "SUPERVISOR"].includes(newRole)) {
        return NextResponse.json({ error: "Rôle agent invalide" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, agentRole: true },
      });
      if (!user) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
      if (user.role !== UserRole.AGENT) {
        return NextResponse.json(
          { error: "Seul un agent peut devenir superviseur" },
          { status: 400 },
        );
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { agentRole: newRole },
        select: { id: true, name: true, email: true, role: true, agentRole: true },
      });

      // Notifier l'agent de son changement de rôle
      try {
        await sendNotification({
          userId,
          title: newRole === "SUPERVISOR" ? "Promotion superviseur" : "Rôle mis à jour",
          message:
            newRole === "SUPERVISOR"
              ? "Félicitations ! Vous êtes désormais superviseur. Vous avez accès à la supervision de votre équipe et à la pré-validation des dossiers KYC."
              : "Votre rôle superviseur a été retiré. Vous conservez votre statut d'agent.",
          type: newRole === "SUPERVISOR" ? "SUCCESS" : "INFO",
          metadata: { agentRole: newRole },
        });
      } catch (notifErr) {
        console.error("[RECRUITMENT_ROLE_NOTIFY]", notifErr);
      }

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "AGENT_ROLE_CHANGED",
        message: `Agent ${updated.email} → rôle ${newRole} (précédent : ${user.agentRole || "AGENT"}) par admin ${payload.id}`,
        userId: payload.id,
        details: { targetUserId: userId, newRole, previousRole: user.agentRole },
      });

      return NextResponse.json({
        success: true,
        user: updated,
        message:
          newRole === "SUPERVISOR"
            ? "Agent promu superviseur"
            : "Rôle superviseur retiré",
      });
    }

    // ACTION: demote agent back to USER
    if (action === "demote" && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.USER },
        select: { id: true, name: true, email: true, role: true },
      });

      await logSystemEvent({
        level: "WARN",
        source: "RECRUITMENT",
        action: "AGENT_DEMOTED",
        message: `Agent ${user.email} rétrogradé en utilisateur par admin ${payload.id}`,
        userId: payload.id,
        details: { targetUserId: userId },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // ACTION: send welcome email/note (stub — extend with real mailer)
    if (action === "sendWelcome" && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

      await logSystemEvent({
        level: "INFO",
        source: "RECRUITMENT",
        action: "WELCOME_SENT",
        message: `Message de bienvenue envoyé à l'agent ${user.email}`,
        userId: payload.id,
        details: { targetUserId: userId },
      });

      return NextResponse.json({ success: true, message: "Message de bienvenue envoyé" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("[RECRUITMENT_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
