export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/search?q=alice&role=AGENT
 *
 * Recherche légère utilisée par les sélecteurs de destinataires
 * (diffusion de notifications, exceptions de plafonds).
 * Retourne au maximum 25 comptes.
 */
export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (payload.role !== "ADMIN")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const role = url.searchParams.get("role");
    const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);

    const where: any = {};

    // Résolution directe d'identifiants (pour réafficher une sélection existante)
    if (ids.length) {
      where.id = { in: ids };
    } else {
      if (role) where.role = role;
      if (q) {
        where.OR = [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { referralCode: { equals: q, mode: "insensitive" } },
        ];
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        kycStatus: true,
        avatar: true,
        referralCode: true,
      },
      orderBy: { createdAt: "desc" },
      take: ids.length ? ids.length : 25,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[v0] USER_SEARCH_ERROR:", error);
    return NextResponse.json({ users: [] });
  }
}
