import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanSearch, displayName, isSupervisorResponse, requirePrincipalSupervisor, roleLabels } from "@/lib/supervisorAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requirePrincipalSupervisor(req);
  if (isSupervisorResponse(actor)) return actor;
  const q = cleanSearch(new URL(req.url).searchParams.get("q") || "");
  if (!q) return NextResponse.json({ error: "Saisissez une recherche." }, { status: 400 });

  const users = await prisma.user.findMany({
    where: { OR: [
      { username: { contains: q, mode: "insensitive" } },
      { id: { equals: q } },
      { email: { equals: q, mode: "insensitive" } },
      { phone: { equals: q } },
      { name: { contains: q, mode: "insensitive" } },
    ] },
    select: { id: true, name: true, firstName: true, lastName: true, username: true, email: true, phone: true, role: true, supervisorType: true, status: true, kycStatus: true, createdAt: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users: users.map((user) => ({ ...user, name: displayName(user), roleLabel: roleLabels[user.role] || user.role })) });
}
