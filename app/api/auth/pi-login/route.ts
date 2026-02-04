import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { piUserId, username } = await request.json();

    if (!piUserId) return NextResponse.json({ error: "UID manquant" }, { status: 400 });

    const user = await prisma.user.upsert({
      where: { piUserId },
      update: { username, lastLoginAt: new Date() },
      create: {
        piUserId,
        username,
        role: "USER",
        status: "ACTIVE",
        wallets: { create: { currency: "PI", balance: 0, type: "PI" } }
      }
    });

    const response = NextResponse.json({ success: true, user });

    // CONFIGURATION SPÉCIFIQUE POUR LE HTTPS DU PI BROWSER
    response.cookies.set("pi_session_token", String(user.id), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      
      // LA CLÉ DU PROBLÈME HTTPS :
      sameSite: "none", // Indispensable pour le Cross-Site en HTTPS
      secure: true,     // Obligatoire quand sameSite est à "none"
      httpOnly: true,
    });

    return response;
  } catch (error: any) {
    console.error("Erreur de soumission Elara:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
