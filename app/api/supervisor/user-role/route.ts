import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSupervisorResponse, requirePrincipalSupervisor, roleLabels } from "@/lib/supervisorAuth";

const schema = z.object({ userId: z.string().min(1), newRole: z.enum(["USER", "AGENT", "SUPERVISEUR"]), supervisorType: z.enum(["PRINCIPAL", "ADJOINT", "NORMAL"]).optional() });

export async function PATCH(req: NextRequest) {
  const actor = await requirePrincipalSupervisor(req);
  if (isSupervisorResponse(actor)) return actor;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  const { userId, newRole, supervisorType } = parsed.data;
  if (userId === actor.id) return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, role: true, status: true, supervisorType: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (["ADMIN", "SUPERVISEUR_PRINCIPAL", "BANK_ADMIN", "BUSINESS_ADMIN"].includes(target.role)) return NextResponse.json({ error: "Ce rôle système ne peut pas être modifié." }, { status: 403 });
  if (target.role === newRole) return NextResponse.json({ error: "Le rôle est déjà sélectionné." }, { status: 400 });
  if (!["USER", "AGENT", "SUPERVISEUR"].includes(target.role)) return NextResponse.json({ error: "Transition non autorisée." }, { status: 403 });
  if (newRole === "SUPERVISEUR" && supervisorType === "PRINCIPAL") return NextResponse.json({ error: "Le superviseur principal ne peut être désigné que par un administrateur." }, { status: 403 });
  const nextSupervisorType = newRole === "SUPERVISEUR" ? (supervisorType || "NORMAL") : null;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: target.id }, data: { role: newRole, supervisorType: nextSupervisorType }, select: { id: true, name: true, username: true, role: true, supervisorType: true } });
    await tx.auditLog.create({ data: { adminId: actor.id, adminName: actor.name || actor.username || actor.id, action: "ROLE_CHANGED", targetId: target.id, category: "rbac", targetType: "user", status: "SUCCESS", details: JSON.stringify({ actorRole: "SUPERVISEUR_PRINCIPAL", previousRole: target.role, newRole }) } });
    return updated;
  });
  return NextResponse.json({ user: { ...result, roleLabel: roleLabels[result.role] || result.role } });
}
