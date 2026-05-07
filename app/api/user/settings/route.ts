export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    // [FIX V13] — Utiliser getAuthUserId() centralisé au lieu du pattern pi_session_token direct
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        kycStatus: true,
        country: true,
        avatar: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
