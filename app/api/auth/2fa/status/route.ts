export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    // [FIX V13] — Utiliser getAuthUserId() centralisé au lieu du pattern pi_session_token direct
    const userId = await getAuthUserId();
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
