export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    if (piToken && piToken.length > 20) {
      userId = piToken;
    } else if (token) {
      const payload = await verifyJWT(token);
      if (!payload) {
        return NextResponse.json({ error: "Session expiree" }, { status: 401 });
      }
      userId = payload.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
    });
  } catch (e) {
    console.error("2FA_STATUS_ERROR:", e);
    return NextResponse.json(
      { error: "Erreur lors de la verification du statut 2FA" },
      { status: 500 }
    );
  }
}
