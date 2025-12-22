import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const payload = adminAuth(req as any); // Cast pour NextRequest si nécessaire
  if (payload instanceof NextResponse) return payload; // Si erreur

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, status: true, role: true },
  });

  return NextResponse.json({ users });
}
