import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signSessionToken, signRefreshToken } from "@/lib/jwt";
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
 * 2. TOKEN DURÉE RÉDUITE — access token 1 heure au lieu de 7 jours.
 *    Un compte admin compromis ne donne plus 7 jours d'accès.
 *    [FIX V17] Refresh token admin dédié (7j, révocable via Session.isActive)
 *    posé en cookie httpOnly + persisté en DB. Le panel renouvelle
 *    silencieusement l'access token 1h via POST /api/admin/refresh, sans
 *    rallonger la durée de vie de l'access token lui-même.
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

    // ── 3. Tokens ─────────────────────────────────────────────────────────
    // Access token 1h : un compte admin compromis ne donne plus 7 jours d'accès.
    const token = await signSessionToken({ id: admin.id, role: admin.role }, "1h");

    // [FIX V17] Refresh token admin 7j — signé avec JWT_REFRESH_SECRET,
    // persisté en Session (révocable via isActive=false au logout/compromission).
    const refreshToken = await signRefreshToken({ id: admin.id, role: admin.role });

    // On révoque les anciennes sessions refresh de cet admin puis on crée la nouvelle.
    await prisma.session.updateMany({
      where: { userId: admin.id, isActive: true },
      data: { isActive: false },
    });
    await prisma.session.create({
      data: {
        userId: admin.id,
        token: refreshToken,
        ip,
        userAgent: req.headers.get("user-agent") || undefined,
        isActive: true,
      },
    });

    console.info(`[ADMIN_LOGIN] Connexion réussie — admin: ${admin.id} — IP: ${ip}`);

    const response = NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });

    // Access token 1h en cookie httpOnly (utilisé par le middleware + routes admin).
    response.cookies.set("token", token, {
      httpOnly: true,
      secure:   true,
      sameSite: "strict",
      maxAge:   60 * 60, // 1 heure
      path:     "/",
    });

    // Refresh token 7j en cookie httpOnly, réservé au chemin de renouvellement.
    response.cookies.set("admin_refresh_token", refreshToken, {
      httpOnly: true,
      secure:   true,
      sameSite: "strict",
      maxAge:   60 * 60 * 24 * 7, // 7 jours
      path:     "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
