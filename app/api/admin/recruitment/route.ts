export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { UserRole, UserStatus } from "@prisma/client";
import { logSystemEvent } from "@/lib/systemLogger";

// ─── Helper: génère le prochain identifiant agent séquentiel (PMB-AGT-000001) ───
// Suit le plus grand numéro déjà attribué afin de garantir l'unicité.
async function generateAgentId(): Promise<string> {
  const existing = await prisma.user.findMany({
    where: { agentId: { not: null } },
    select: { agentId: true },
  });
  let max = 0;
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

    const [rawAgents, total, stats, totalAgents] = await Promise.all([
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
