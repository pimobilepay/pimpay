import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { piUserId, username } = await request.json();

    if (!piUserId) return NextResponse.json({ error: "UID manquant" }, { status: 400 });

    // On récupère ou crée l'utilisateur
    const user = await prisma.user.upsert({
      where: { piUserId },
      update: { username, lastLoginAt: new Date() },
      create: {
        piUserId,
        username,
        role: "USER", // Par défaut
        status: "ACTIVE",
        wallets: { create: { currency: "PI", balance: 0, type: "PI" } }
      }
    });

    // REPRODUCTION DU SUCCÈS DU 15 JANVIER
    const response = NextResponse.json({ success: true, user });

    // On pose aussi le cookie côté serveur pour doubler la sécurité du Hook
    response.cookies.set("pi_session_token", user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: "lax",
      secure: true,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
