export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload || payload instanceof NextResponse) {
      return payload || NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("q")?.trim() || "";
    const status = req.nextUrl.searchParams.get("status")?.toUpperCase() || "ALL";
    const where = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
      ...(status === "VERIFIED" ? { isVerified: true } : status === "PENDING" ? { isVerified: false } : {}),
    };

    const merchants = await prisma.merchant.findMany({
      where,
      select: {
        id: true, name: true, category: true, address: true, city: true, country: true,
        piPaymentStatus: true, rating: true, isVerified: true, createdAt: true,
        user: { select: { id: true, email: true, name: true, username: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ merchants });
  } catch (error) {
    console.error("API_ADMIN_MERCHANTS_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
