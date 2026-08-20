import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSupervisorResponse, requirePrincipalSupervisor, roleLabels } from "@/lib/supervisorAuth";

const schema = z.object({ userId: z.string().min(1), newRole: z.enum(["AGENT", "SUPERVISEUR"]) });

export async function PATCH(req: NextRequest) {
  const actor = await requirePrincipalSupervisor(req);
  if (isSupervisorResponse(actor)) return actor;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  const { userId, newRole } = parsed.data;
  if (userId === actor.id) return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (["ADMIN", "SUPERVISEUR_PRINCIPAL", "BANK_ADMIN", "BUSINESS_ADMIN"].includes(target.role)) return NextResponse.json({ error: "Ce rôle système ne peut pas être modifié." }, { status: 403 });
  if (target.role === newRole) return NextResponse.json({ error: "Le rôle est déjà sélectionné." }, { status: 400 });
  if (!["USER", "AGENT", "SUPERVISEUR"].includes(target.role)) return NextResponse.json({ error: "Transition non autorisée." }, { status: 403 });

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: target.id }, data: { role: newRole }, select: { id: true, name: true, username: true, role: true } });
    await tx.auditLog.create({ data: { adminId: actor.id, adminName: actor.name || actor.username || actor.id, action: "ROLE_CHANGED", targetId: target.id, category: "rbac", targetType: "user", status: "SUCCESS", details: JSON.stringify({ actorRole: "SUPERVISEUR_PRINCIPAL", previousRole: target.role, newRole }) } });
    return updated;
  });
  return NextResponse.json({ user: { ...result, roleLabel: roleLabels[result.role] || result.role } });
}
