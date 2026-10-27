import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Saisissez au moins 2 caractères" }, { status: 400 });
  }

  try {
    const merchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { id: query },
          { name: { contains: query, mode: "insensitive" } },
          { user: { is: { id: query } } },
          { user: { is: { username: query.replace(/^@/, "") } } },
          { user: { is: { piUserId: query } } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        isVerified: true,
        logoUrl: true,
        user: {
          select: { id: true, username: true, name: true, firstName: true, lastName: true, avatar: true, piUserId: true },
        },
      },
    });

    if (!merchant) return NextResponse.json({ error: "Marchand introuvable" }, { status: 404 });

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.user?.name || merchant.name,
        category: merchant.category,
        verified: merchant.isVerified,
        avatar: merchant.user?.avatar || merchant.logoUrl,
        username: merchant.user?.username,
        userId: merchant.user?.id,
        piUserId: merchant.user?.piUserId,
      },
    });
  } catch (error) {
    console.error("[v0] merchant lookup failed", error);
    return NextResponse.json({ error: "Impossible de récupérer le marchand" }, { status: 500 });
  }
}
