import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { getPiVerifySession, applyPiVerifyResult, PiVerifyError } from "@/lib/piverify";

export const dynamic = "force-dynamic";

/**
 * GET /api/kyc/piverify/status?sessionId=ks_...
 * Interroge PiVerify et applique le résultat au compte (filet de sécurité si
 * le webhook n'a pas encore été reçu — indispensable en sandbox/dev).
 * Vérifie que la session appartient bien à l'utilisateur connecté.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const session = await getPiVerifySession(sessionId);

    // Anti-IDOR : la session doit correspondre à l'utilisateur connecté.
    if (session.external_user_id !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    let kycStatus: string | undefined;
    if (["approved", "rejected", "failed", "started", "pending_review"].includes(session.status)) {
      const result = await applyPiVerifyResult({
        externalUserId: userId,
        status: session.status,
        sessionId: session.id,
        rejectionReason: session.rejection_reason,
      });
      kycStatus = result.kycStatus;
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      rejectionReason: session.rejection_reason,
      allowedAction: session.allowed_action ?? null,
      hostedFlowUrl: session.hosted_flow_url,
      kycStatus,
    });
  } catch (error) {
    if (error instanceof PiVerifyError) {
      const status = error.status === 404 ? 404 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[PIVERIFY_STATUS]", error);
    return NextResponse.json(
      { error: "Impossible de récupérer le statut PiVerify." },
      { status: 500 }
    );
  }
}
