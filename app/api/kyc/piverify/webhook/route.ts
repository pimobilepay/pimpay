import { NextRequest, NextResponse } from "next/server";
import {
  verifyPiVerifyWebhook,
  applyPiVerifyResult,
  type PiVerifyWebhookEvent,
} from "@/lib/piverify";

export const dynamic = "force-dynamic";

/**
 * POST /api/kyc/piverify/webhook
 * Endpoint de callback PiVerify. Valide la signature HMAC-SHA256 du corps brut
 * puis applique le résultat. À renseigner dans la page Webhooks du portail.
 */
export async function POST(req: NextRequest) {
  // IMPORTANT : lire le corps BRUT pour calculer la signature.
  const rawBody = await req.text();
  const signature = req.headers.get("x-piverify-signature");

  if (!verifyPiVerifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: PiVerifyWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  try {
    const { external_user_id, status, session_id, rejection_reason } = event.data;

    await applyPiVerifyResult({
      externalUserId: external_user_id,
      status,
      sessionId: session_id,
      rejectionReason: rejection_reason ?? null,
    });

    // Toujours 200 après traitement pour éviter les re-livraisons inutiles.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[PIVERIFY_WEBHOOK]", error);
    // 500 -> PiVerify retentera (backoff exponentiel, jusqu'à 5 fois).
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
