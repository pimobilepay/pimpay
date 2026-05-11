import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signSessionToken } from "@/lib/jwt";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * [FIX N3] — Admin login sécurisé
 *
 * Corrections apportées :
 *
 * 1. RATE LIMITING — 3 tentatives / 5 minutes par IP.
 *    Le login admin est plus sensible que le login user (accès total plateforme).
 *    Limite intentionnellement plus stricte que /api/auth/login (10/60s).
 *    Après 3 échecs, l'IP est bloquée 5 minutes avec Retry-After header.
 *
 * 2. TOKEN DURÉE RÉDUITE — 1 heure au lieu de 7 jours.
 *    Un compte admin compromis ne donne plus 7 jours d'accès.
 *    Le panel admin doit renouveler la session toutes les heures.
 *    Pour une session persistante, implémenter un refresh token admin dédié.
 *
 * 3. ERROR MESSAGE GÉNÉRIQUE — ne pas distinguer "email inconnu" vs "mot de passe
 *    invalide" pour éviter l'énumération de comptes admin.
 */
export async function POST(req: NextRequest) {
  // ── 1. Rate limiting — 3 tentatives / 5 min par IP ──────────────────────
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-login:${ip}`, 3, 5 * 60_000);
  if (rl.limited) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    console.warn(`[ADMIN_LOGIN] Brute force bloqué — IP: ${ip}`);
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 5 minutes." },
      {
        status: 429,
        headers: {
          "Retry-After":          String(retryAfter),
          "X-RateLimit-Limit":    "3",
          "X-RateLimit-Remaining":"0",
          "X-RateLimit-Reset":    String(rl.resetAt),
        },
      }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
    }

    const { email, password } = body;

    // ── 2. Vérification identité admin ────────────────────────────────────
    const admin = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, email: true, name: true, password: true, status: true },
    });

    // Message générique — ne pas distinguer "email inconnu" vs "mdp invalide"
    // pour bloquer l'énumération de comptes admin.
    if (
      !admin ||
      admin.role !== "ADMIN" ||
      admin.status !== "ACTIVE" ||
      !admin.password ||
      !(await bcrypt.compare(password, admin.password))
    ) {
      console.warn(`[ADMIN_LOGIN] Échec — email: ${email} — IP: ${ip}`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // ── 3. Token — 1h (au lieu de 7j) ────────────────────────────────────
    // Un compte admin compromis ne donne plus accès 7 jours.
    // Pour une session persistante, ajouter un refresh token admin dédié.
    const token = await signSessionToken({ id: admin.id, role: admin.role }, "1h");

    console.info(`[ADMIN_LOGIN] Connexion réussie — admin: ${admin.id} — IP: ${ip}`);

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
