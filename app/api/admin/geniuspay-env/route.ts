export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";
import {
  getGeniusPayEnv,
  getGeniusPayCredentialStatus,
  getGeniusPayWebhookUrl,
  getGeniusPayBaseUrl,
  normalizeGeniusPayEnv,
} from "@/lib/geniuspay";
import { hydrateGeniusPayEnv, setGeniusPayEnv } from "@/lib/geniuspay-env";

/**
 * GET  /api/admin/geniuspay-env
 *   Retourne l'environnement Mobile Money GeniusPay actif, l'URL du webhook a
 *   declarer dans le dashboard GeniusPay et l'etat des cles pour cet
 *   environnement (present / absent, sans jamais exposer les valeurs).
 *
 * POST /api/admin/geniuspay-env  { env: "sandbox" | "production" }
 *   Bascule Sandbox <-> Production. La valeur est persistee en base
 *   (SystemConfig.geniuspayEnv) et projetee dans process.env.GENIUSPAY_ENV :
 *   aucun redeploiement n'est necessaire, seules les cles changent.
 */

function buildPayload(changed?: boolean, message?: string) {
  const env = getGeniusPayEnv();
  const credentials = getGeniusPayCredentialStatus();

  return {
    env,
    live: env === "production",
    label: env === "production" ? "PRODUCTION" : "SANDBOX",
    apiBaseUrl: getGeniusPayBaseUrl(),
    webhookUrl: getGeniusPayWebhookUrl(),
    /** Variables attendues pour l'environnement actif (les cles restent en env). */
    expectedVars:
      env === "production"
        ? [
            "GENIUSPAY_API_KEY_LIVE",
            "GENIUSPAY_API_SECRET_LIVE",
            "GENIUSPAY_WEBHOOK_SECRET_LIVE",
            "GENIUSPAY_WALLET_ID_LIVE",
          ]
        : [
            "GENIUSPAY_API_KEY_SANDBOX",
            "GENIUSPAY_API_SECRET_SANDBOX",
            "GENIUSPAY_WEBHOOK_SECRET_SANDBOX",
            "GENIUSPAY_WALLET_ID_SANDBOX",
          ],
    credentials: {
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      webhookSecret: credentials.webhookSecret,
      walletId: credentials.walletId,
      keyPrefix: credentials.keyPrefix,
      mismatch: credentials.mismatch,
      ready: credentials.ready,
    },
    ...(changed !== undefined ? { changed } : {}),
    ...(message ? { message } : {}),
  };
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  await hydrateGeniusPayEnv(true);
  return NextResponse.json(buildPayload());
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  let body: { env?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const raw = (body.env || "").toLowerCase().trim();
  if (raw !== "sandbox" && raw !== "production") {
    return NextResponse.json(
      { error: 'Valeur invalide — "sandbox" ou "production" attendu' },
      { status: 400 }
    );
  }
  const next = normalizeGeniusPayEnv(raw);

  await hydrateGeniusPayEnv(true);
  const previous = getGeniusPayEnv();

  if (previous === next) {
    return NextResponse.json(
      buildPayload(false, `Environnement deja configure sur ${next}`)
    );
  }

  // Garde-fou : refuser la bascule si les cles de l'environnement cible sont
  // absentes — sinon tous les paiements Mobile Money echoueraient en silence.
  const before = process.env.GENIUSPAY_ENV;
  process.env.GENIUSPAY_ENV = next;
  const target = getGeniusPayCredentialStatus();
  process.env.GENIUSPAY_ENV = before;

  if (!target.ready) {
    const suffix = next === "production" ? "LIVE" : "SANDBOX";
    return NextResponse.json(
      {
        error:
          `Cles GeniusPay manquantes pour l'environnement "${next}". ` +
          `Ajoutez GENIUSPAY_API_KEY_${suffix} et GENIUSPAY_API_SECRET_${suffix} ` +
          `dans les variables d'environnement du projet avant de basculer.`,
        missing: [
          !target.apiKey ? `GENIUSPAY_API_KEY_${suffix}` : null,
          !target.apiSecret ? `GENIUSPAY_API_SECRET_${suffix}` : null,
        ].filter(Boolean),
      },
      { status: 409 }
    );
  }

  try {
    await setGeniusPayEnv(next);
  } catch (err: any) {
    // La colonne geniuspayEnv n'existe peut-etre pas encore en base :
    // on applique quand meme en memoire et on trace l'avertissement.
    console.warn(
      "[geniuspay-env] Impossible de persister geniuspayEnv en DB:",
      err?.message
    );
    process.env.GENIUSPAY_ENV = next;
    await logSystemEvent({
      level: "WARN",
      source: "ADMIN_GENIUSPAY_ENV",
      action: "DB_PERSIST_FAILED",
      message: `Impossible de persister geniuspayEnv="${next}" en DB: ${err?.message}`,
      details: { env: next, error: err?.message },
    });
  }

  await logSystemEvent({
    level: next === "production" ? "WARN" : "INFO",
    source: "ADMIN_GENIUSPAY_ENV",
    action: "ENV_SWITCHED",
    message: `Environnement GeniusPay (Mobile Money) bascule: ${previous} -> ${next}`,
    details: {
      previous,
      env: next,
      webhookUrl: getGeniusPayWebhookUrl(),
      keyPrefix: target.keyPrefix,
      adminId: (auth as any)?.id,
      adminEmail: (auth as any)?.email,
    },
  });

  return NextResponse.json(
    buildPayload(
      true,
      `Mobile Money GeniusPay bascule sur ${
        next === "production" ? "PRODUCTION" : "SANDBOX"
      }`
    )
  );
}
