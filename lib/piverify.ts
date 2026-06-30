import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { grantReferrerBonusIfEligible } from "@/app/api/referral/route";

/**
 * Client serveur PiVerify (KYC hébergé Pi Network).
 *
 * Référence : documentation officielle PiVerify.
 *  - Auth : header `Authorization: Bearer <PIVERIFY_API_KEY>`
 *  - La clé (sbx_... en sandbox, live_... en production) NE DOIT JAMAIS
 *    transiter côté navigateur. Tous les appels passent par le serveur.
 *
 * Flux :
 *   1. createSession()  -> POST /api/v1/kyc_sessions  -> hosted_flow_url
 *   2. l'utilisateur complète le parcours hébergé (ou SDK embarqué)
 *   3. PiVerify notifie via webhook signé, OU on interroge getSession()
 *   4. applyPiVerifyResult() applique le résultat au compte PimPay
 */

// Base URL configurable (défaut : environnement staging/sandbox officiel des docs).
const PIVERIFY_BASE_URL =
  process.env.PIVERIFY_BASE_URL ||
  "https://backend.piverify-czgzri81fq2lioqn.staging.piappengine.com";

const API_PREFIX = "/api/v1";

/** Statuts renvoyés par l'API PiVerify. */
export type PiVerifyStatus =
  | "created"
  | "started"
  | "pending_review"
  | "approved"
  | "rejected"
  | "failed";

export interface PiVerifySession {
  id: string;
  status: PiVerifyStatus;
  hosted_flow_url: string;
  external_user_id: string;
  rejection_reason: string | null;
  allowed_action?: "RESUBMIT" | "APPEAL" | null;
  created_at: string;
  updated_at: string;
}

export interface PiVerifyWebhookEvent {
  id: string;
  type:
    | "kyc.session.started"
    | "kyc.session.pending_review"
    | "kyc.session.approved"
    | "kyc.session.rejected"
    | "kyc.session.failed";
  created_at: string;
  data: {
    session_id: string;
    external_user_id: string;
    status: PiVerifyStatus;
    rejection_reason?: string | null;
    allowed_action?: "RESUBMIT" | "APPEAL" | null;
  };
}

function getApiKey(): string {
  const key = process.env.PIVERIFY_API_KEY;
  if (!key) {
    throw new Error(
      "PIVERIFY_API_KEY manquante. Ajoutez votre clé serveur PiVerify (sbx_... ou live_...)."
    );
  }
  return key;
}

/** Indique si l'environnement courant est sandbox (clé sbx_). */
export function isPiVerifySandbox(): boolean {
  return (process.env.PIVERIFY_API_KEY || "").startsWith("sbx_");
}

async function piVerifyFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | { error?: string } }> {
  const res = await fetch(`${PIVERIFY_BASE_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return { ok: res.ok, status: res.status, data };
}

/**
 * Crée une session de vérification.
 * `externalUserId` = identifiant interne PimPay (User.id). Il sert de clé de
 * corrélation pour le webhook et le polling — aucun champ DB supplémentaire requis.
 */
export async function createPiVerifySession(params: {
  externalUserId: string;
  idempotencyKey?: string;
}): Promise<PiVerifySession> {
  const { ok, status, data } = await piVerifyFetch<PiVerifySession>("/kyc_sessions", {
    method: "POST",
    body: JSON.stringify({
      external_user_id: params.externalUserId,
      idempotency_key: params.idempotencyKey || crypto.randomUUID(),
    }),
  });

  if (!ok) {
    const message = (data as { error?: string })?.error || `Erreur PiVerify (${status})`;
    throw new PiVerifyError(message, status);
  }

  return data as PiVerifySession;
}

/** Récupère l'état courant d'une session par son id (`ks_...`). */
export async function getPiVerifySession(sessionId: string): Promise<PiVerifySession> {
  const { ok, status, data } = await piVerifyFetch<PiVerifySession>(
    `/kyc_sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" }
  );

  if (!ok) {
    const message = (data as { error?: string })?.error || `Erreur PiVerify (${status})`;
    throw new PiVerifyError(message, status);
  }

  return data as PiVerifySession;
}

/**
 * Émet un token court (15 min) pour l'embed via le SDK JS PiVerify.
 * À récupérer côté serveur juste avant `PiKYC.init()`.
 */
export async function getPiVerifySdkToken(sessionId: string): Promise<string> {
  const { ok, status, data } = await piVerifyFetch<{ sdk_token: string }>(
    `/kyc_sessions/${encodeURIComponent(sessionId)}/sdk_token`,
    { method: "GET" }
  );

  if (!ok) {
    const message = (data as { error?: string })?.error || `Erreur PiVerify (${status})`;
    throw new PiVerifyError(message, status);
  }

  return (data as { sdk_token: string }).sdk_token;
}

/**
 * Vérifie la signature d'un webhook PiVerify.
 * Header `X-PiVerify-Signature: sha256=<hex>` = HMAC-SHA256 du corps brut
 * signé avec PIVERIFY_WEBHOOK_SECRET. Comparaison à temps constant.
 */
export function verifyPiVerifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PIVERIFY_WEBHOOK_SECRET;
  // Sans secret configuré, on ne peut pas valider : on refuse par sécurité.
  if (!secret) {
    console.error("[PiVerify] PIVERIFY_WEBHOOK_SECRET non défini — webhook rejeté.");
    return false;
  }
  if (!signature) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export class PiVerifyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PiVerifyError";
    this.status = status;
  }
}

/**
 * Applique un résultat PiVerify au compte PimPay.
 *
 * Source de vérité partagée entre le webhook et le polling de statut.
 * Idempotent : ne re-déclenche pas les effets (bonus / notification) si le
 * statut KYC cible est déjà atteint.
 *
 *  approved        -> kycStatus VERIFIED (+ bonus parrainage + notif succès)
 *  rejected/failed -> kycStatus REJECTED (+ notif + motif)
 *  started/pending -> kycStatus PENDING
 */
export async function applyPiVerifyResult(params: {
  externalUserId: string;
  status: PiVerifyStatus;
  sessionId?: string;
  rejectionReason?: string | null;
}): Promise<{ applied: boolean; kycStatus?: string }> {
  const { externalUserId, status, sessionId, rejectionReason } = params;

  const user = await prisma.user.findUnique({
    where: { id: externalUserId },
    select: { id: true, kycStatus: true, email: true, username: true },
  });

  if (!user) {
    console.error(`[PiVerify] Utilisateur introuvable: ${externalUserId}`);
    return { applied: false };
  }

  // Journal d'audit (réutilise securityLog, aucun nouveau modèle requis).
  await prisma.securityLog
    .create({
      data: {
        userId: user.id,
        action: `PIVERIFY_${status.toUpperCase()}`,
        ip: "piverify",
        device: JSON.stringify({ sessionId, status, rejectionReason }),
      },
    })
    .catch((e) => console.error("[PiVerify] securityLog ignoré:", e));

  // --- approved ---
  if (status === "approved") {
    if (user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED") {
      return { applied: false, kycStatus: user.kycStatus };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "VERIFIED", kycVerifiedAt: new Date(), kycReason: null },
    });
    await grantReferrerBonusIfEligible(user.id).catch((e) =>
      console.error("[PiVerify] bonus parrainage ignoré:", e)
    );
    await sendNotification({
      userId: user.id,
      title: "Identité vérifiée !",
      message:
        "Félicitations ! Votre identité a été vérifiée via PiVerify. Vous avez désormais accès à toutes les fonctionnalités de PimPay.",
      type: "SUCCESS",
      metadata: { status: "APPROVED" },
    });
    return { applied: true, kycStatus: "VERIFIED" };
  }

  // --- rejected / failed ---
  if (status === "rejected" || status === "failed") {
    if (user.kycStatus === "REJECTED") {
      return { applied: false, kycStatus: user.kycStatus };
    }
    const reason =
      rejectionReason ||
      (status === "failed"
        ? "La vérification n'a pas pu aboutir (erreur du prestataire)."
        : "Votre vérification d'identité a été refusée.");
    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "REJECTED", kycReason: reason },
    });
    await sendNotification({
      userId: user.id,
      title: "Vérification refusée",
      message: `${reason} Vous pouvez relancer la vérification PiVerify.`,
      type: "warning",
      metadata: { status: "REJECTED" },
    });
    return { applied: true, kycStatus: "REJECTED" };
  }

  // --- started / pending_review ---
  if (status === "started" || status === "pending_review") {
    if (user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED") {
      return { applied: false, kycStatus: user.kycStatus };
    }
    if (user.kycStatus !== "PENDING") {
      await prisma.user.update({
        where: { id: user.id },
        data: { kycStatus: "PENDING", kycSubmittedAt: new Date() },
      });
    }
    return { applied: true, kycStatus: "PENDING" };
  }

  return { applied: false, kycStatus: user.kycStatus };
}
