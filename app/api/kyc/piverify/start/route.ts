import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPiVerifySession, PiVerifyError } from "@/lib/piverify";

export const dynamic = "force-dynamic";

/**
 * POST /api/kyc/piverify/start
 * Crée une session PiVerify pour l'utilisateur connecté et renvoie l'URL
 * du parcours hébergé. La clé API reste exclusivement côté serveur.
 */
export async function POST(_req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kycStatus: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED") {
      return NextResponse.json(
        { error: "Votre identité est déjà vérifiée." },
        { status: 400 }
      );
    }

    const session = await createPiVerifySession({ externalUserId: user.id });

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      hostedFlowUrl: session.hosted_flow_url,
    });
  } catch (error) {
    if (error instanceof PiVerifyError) {
      const status = error.status === 402 ? 402 : error.status === 429 ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[PIVERIFY_START]", error);
    return NextResponse.json(
      { error: "Impossible de démarrer la vérification PiVerify." },
      { status: 500 }
    );
  }
}
