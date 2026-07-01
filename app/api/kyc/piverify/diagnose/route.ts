import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/kyc/piverify/diagnose
 *
 * Route de diagnostic (temporaire) pour comprendre l'erreur
 * « Invalid or inactive API key ».
 *
 * Elle N'EXPOSE JAMAIS la clé : uniquement le préfixe, la longueur, et si des
 * espaces parasites étaient présents. Elle effectue un appel de test réel à
 * PiVerify et renvoie le statut HTTP + le message brut renvoyé par PiVerify.
 *
 * Ouvrez cette URL sur votre déploiement, connecté à votre compte :
 *   https://VOTRE-SITE/api/kyc/piverify/diagnose
 */
export async function GET(_req: NextRequest) {
  // Protégé : il faut être connecté pour éviter toute fuite d'info.
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const raw = process.env.PIVERIFY_API_KEY;
  const trimmed = (raw || "").trim();

  const keyInfo = {
    present: Boolean(raw),
    length_raw: raw ? raw.length : 0,
    length_trimmed: trimmed.length,
    had_surrounding_whitespace: Boolean(raw) && raw !== trimmed,
    prefix: trimmed ? trimmed.slice(0, 4) : null,
    last4: trimmed ? trimmed.slice(-4) : null,
    looks_sandbox: trimmed.startsWith("sbx_"),
    looks_live: trimmed.startsWith("live_"),
  };

  const baseUrl =
    process.env.PIVERIFY_BASE_URL ||
    "https://backend.piverify-czgzri81fq2lioqn.staging.piappengine.com";

  let liveTest: {
    reached: boolean;
    http_status: number | null;
    piverify_response: unknown;
    error?: string;
  } = { reached: false, http_status: null, piverify_response: null };

  if (trimmed) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/kyc_sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trimmed}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_user_id: `diagnose_${userId}`,
          idempotency_key: `diagnose_${Date.now()}`,
        }),
        cache: "no-store",
      });

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = "<réponse non-JSON>";
      }

      liveTest = {
        reached: true,
        http_status: res.status,
        piverify_response: body,
      };
    } catch (e) {
      liveTest = {
        reached: false,
        http_status: null,
        piverify_response: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // Interprétation lisible du résultat.
  let verdict = "Clé absente de cet environnement de déploiement.";
  if (trimmed && liveTest.http_status === 401) {
    verdict =
      "PiVerify rejette la clé (401 Invalid or inactive). La clé est mal copiée, révoquée, ou pas encore ACTIVÉE dans votre dashboard PiVerify. Vérifiez son statut côté PiVerify et recopiez-la intégralement.";
  } else if (trimmed && liveTest.http_status && liveTest.http_status < 300) {
    verdict = "La clé fonctionne : PiVerify a accepté la requête.";
  } else if (trimmed && liveTest.http_status === 404) {
    verdict =
      "Endpoint introuvable (404) : PIVERIFY_BASE_URL pointe probablement vers la mauvaise application PiVerify.";
  }

  return NextResponse.json({
    baseUrl,
    key: keyInfo,
    liveTest,
    verdict,
  });
}
