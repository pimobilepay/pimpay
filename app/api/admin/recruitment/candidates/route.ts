export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { UserRole, UserStatus } from "@prisma/client";

// GET: list non-agent users as potential candidates
export async function GET(req: NextRequest) {
  const payload = await adminAuth(req);
  if (!payload) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const candidates = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.USER, UserRole.MERCHANT] },
      status: UserStatus.ACTIVE,
      kycStatus: "VERIFIED",
      AND: search
        ? [{ OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ]}]
        : [],
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      avatar: true,
      city: true,
      country: true,
      kycStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ candidates });
}
