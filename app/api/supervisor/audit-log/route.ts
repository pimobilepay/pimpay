import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSupervisorResponse, requirePrincipalSupervisor } from "@/lib/supervisorAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requirePrincipalSupervisor(req);
  if (isSupervisorResponse(actor)) return actor;
  const logs = await prisma.auditLog.findMany({ where: { adminId: actor.id, action: "ROLE_CHANGED" }, select: { id: true, targetId: true, details: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json({ logs });
}
