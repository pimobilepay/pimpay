import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";

export async function requirePrincipalSupervisor(req: NextRequest) {
  const payload = await getAuthPayload();
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const actor = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, username: true, role: true, agentType: true, status: true, adminProfile: { select: { active: true, permissions: true } } },
  });
  if (!actor || actor.status !== "ACTIVE") return NextResponse.json({ error: "Compte inactif" }, { status: 403 });
  if (actor.role !== "SUPERVISEUR_PRINCIPAL" || actor.agentType !== "ADMINISTRATIF") return NextResponse.json({ error: "Seul le superviseur principal administratif peut modifier les rôles." }, { status: 403 });
  if (!actor.adminProfile?.active || !actor.adminProfile.permissions.includes(PERMISSIONS.USERS_CHANGE_AGENT_SUPERVISOR_ROLE)) {
    return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
  }
  return actor;
}

export function isSupervisorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export const roleLabels: Record<string, string> = {
  USER: "UTILISATEUR",
  AGENT: "AGENT",
  SUPERVISEUR: "SUPERVISEUR",
  ADMIN: "SUPER_ADMIN",
  SUPERVISEUR_PRINCIPAL: "SUPERVISEUR PRINCIPAL",
};

export function cleanSearch(value: string) {
  return value.trim().slice(0, 120);
}

export function displayName(user: { name: string | null; firstName?: string | null; lastName?: string | null; username: string | null }) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Utilisateur";
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
