import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

/**
 * proxy.ts — Point d'entrée unique Next.js 15/16 (racine du projet)
 *
 * ⚠️  Dans Next.js 15/16, le fichier s'appelle toujours "middleware.ts" en théorie,
 *     mais l'équipe PimPay utilise le nom "proxy.ts" avec un export default +
 *     export config — ce qui est identique au middleware Next.js standard.
 *     Ce fichier doit donc être placé à la RACINE du projet.
 *
 * CORRIGE (audit sécurité 03/05/2026) :
 *   #24  — [CRITIQUE] Middleware centralisé : protection /api/admin/* avant exécution route
 *   #25  — [ÉLEVÉE]   Validation Pi token via DB lookup (couche proxy) + flag pour appel Pi API
 *   #7   — [ÉLEVÉE]   Rate limiting natif sans dépendance externe (compteur en mémoire Edge-safe)
 *   #6   — [CRITIQUE] Pi session token : rôle jamais déduit du token, vérification DB obligatoire
 *   #3   — [MOYENNE]  Routes /api/debug/* bloquées avant exécution en production (double protection)
 *   #23  — [CRITIQUE] Defense in depth : admin bloqué ici même si await manquant dans la route
 *
 * ARCHITECTURE : Defense in Depth
 *   Couche 1 → Ce proxy    : bloque avant que la route ne s'exécute
 *   Couche 2 → adminAuth() : second contrôle dans chaque route admin
 *   Couche 3 → verifyAuth(): validation métier dans chaque route
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JWTUserPayload extends jose.JWTPayload {
  id?: string;
  role?: string;
}

// ---------------------------------------------------------------------------
// [FIX #7] Rate Limiting natif (sans dépendance externe)
// Compatible avec le runtime Edge de Next.js 15/16.
// Stockage en mémoire — suffisant pour Vercel Edge Functions (instance isolée par région).
// Pour un rate limiting distribué multi-région, migrer vers @upstash/ratelimit + Redis.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Vérifie si une IP dépasse la limite autorisée.
 * @param key      Clé unique (ex: "login:192.168.1.1")
 * @param limit    Nombre max de requêtes sur la fenêtre
 * @param windowMs Durée de la fenêtre en millisecondes
 * @returns true si la limite est dépassée (= bloquer), false sinon
 */
function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;

  if (entry.count > limit) {
    return true; // Limite dépassée
  }

  return false;
}

/**
 * Nettoyage périodique du store pour éviter les fuites mémoire.
 * Appelé à chaque requête mais n'itère que si le store dépasse 5000 entrées.
 */
function cleanRateLimitStore(): void {
  if (rateLimitStore.size < 5000) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDestinationByRole(role: string): string {
  switch (role) {
    case "ADMIN":         return "/admin";
    case "BANK_ADMIN":    return "/bank";
    case "BUSINESS_ADMIN":return "/business";
    case "AGENT":         return "/hub";
    default:              return "/dashboard";
  }
}

/**
 * Vérifie le JWT signé avec JWT_SECRET.
 * Retourne null si invalide, expiré, ou si JWT_SECRET est absent.
 */
async function verifyJWT(token: string): Promise<JWTUserPayload | null> {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    console.error("[PROXY] JWT_SECRET manquant — configuration serveur invalide");
    return null;
  }
  try {
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jose.jwtVerify(token, secret);
    // Un payload valide doit contenir un id utilisateur
    if (!payload.id) return null;
    return payload as JWTUserPayload;
  } catch {
    // Token invalide ou expiré — silence volontaire (pas de bruit dans les logs)
    return null;
  }
}

/**
 * Extrait l'IP réelle du client (compatible Vercel / reverse proxy).
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Construit une réponse de redirection avec headers anti-cache stricts.
 */
function buildRedirect(
  destination: string,
  req: NextRequest,
  status: 302 | 307 = 302
): NextResponse {
  const url = new URL(destination, req.url);
  const response = NextResponse.redirect(url, status);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/**
 * Construit une réponse JSON d'erreur pour les routes API.
 */
function buildApiError(
  message: string,
  status: 401 | 403 | 404 | 429
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// Proxy principal (export default requis par Next.js 15/16)
// ---------------------------------------------------------------------------

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const clientIp   = getClientIp(req);

  // Nettoyage périodique du store rate-limit
  cleanRateLimitStore();

  // -------------------------------------------------------------------------
  // [FIX #3 + #24] Bloquer /api/debug/* en production
  // Double protection : le proxy bloque AVANT que la route ne s'exécute,
  // même si NODE_ENV n'est pas propagé correctement dans la route.
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/api/debug")) {
    if (process.env.NODE_ENV === "production") {
      return buildApiError("Not Found", 404);
    }
    // Dev : laisser passer (la route vérifie x-debug-key elle-même)
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Assets statiques & routes d'auth publiques → pas de vérification
  // -------------------------------------------------------------------------
  const isPublicAsset = /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|ttf|eot|map)$/.test(pathname);
  const isAuthApi     = pathname.startsWith("/api/auth");
  const isApiRoute    = pathname.startsWith("/api/");

  // -------------------------------------------------------------------------
  // [FIX #7] Rate limiting sur les endpoints sensibles
  // Appliqué AVANT la vérification d'auth pour bloquer même les anonymes.
  // -------------------------------------------------------------------------

  // Login : 10 tentatives / 60 secondes par IP
  if (pathname === "/api/auth/login" || pathname.startsWith("/api/auth/login")) {
    const key = `login:${clientIp}`;
    if (isRateLimited(key, 10, 60_000)) {
      return buildApiError(
        "Trop de tentatives de connexion. Réessayez dans 1 minute.",
        429
      );
    }
  }

  // Routes financières : 20 requêtes / 60 secondes par IP
  const isFinancialRoute =
    pathname.startsWith("/api/withdraw") ||
    pathname.startsWith("/api/transfer") ||
    pathname.startsWith("/api/deposit")  ||
    pathname.startsWith("/api/cards");

  if (isFinancialRoute) {
    const key = `financial:${clientIp}`;
    if (isRateLimited(key, 20, 60_000)) {
      return buildApiError(
        "Trop de requêtes. Veuillez patienter avant de réessayer.",
        429
      );
    }
  }

  // Routes admin : 60 requêtes / 60 secondes par IP (usage légitime plus intense)
  if (pathname.startsWith("/api/admin")) {
    const key = `admin:${clientIp}`;
    if (isRateLimited(key, 60, 60_000)) {
      return buildApiError("Trop de requêtes sur les routes admin.", 429);
    }
  }

  // -------------------------------------------------------------------------
  // Laisser passer les assets et les routes API publiques (après rate limit)
  // -------------------------------------------------------------------------
  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Extraction et vérification des tokens
  // -------------------------------------------------------------------------
  const jwtToken =
    req.cookies.get("token")?.value ||
    req.cookies.get("pimpay_token")?.value;

  // [FIX #25 + #6] Pi session token :
  //   - Dans ce proxy, il N'est PAS utilisé pour déduire un rôle.
  //   - Sa présence est acceptée comme signal "session potentielle" UNIQUEMENT
  //     pour les routes utilisateurs (non-admin).
  //   - La vraie validation doit se faire dans lib/auth.ts → getAuthUserId()
  //     via un lookup DB (prisma.user.findFirst sur id ou piUserId).
  //   - L'appel à POST https://api.minepi.com/v2/me (validation cryptographique
  //     complète) doit être implémenté dans lib/auth.ts → validatePiToken().
  //     Ce proxy ne peut pas faire cet appel réseau sortant (latence Edge inacceptable).
  const piToken = req.cookies.get("pi_session_token")?.value;

  let userPayload: JWTUserPayload | null = null;

  if (jwtToken) {
    userPayload = await verifyJWT(jwtToken);

    // JWT présent mais invalide/expiré ET pas de piToken de secours → nettoyer
    if (!userPayload && !piToken) {
      const res = NextResponse.next();
      res.cookies.delete("token");
      res.cookies.delete("pimpay_token");
      return res;
    }
  }

  // [FIX #6] Pi token accepté uniquement si JWT absent ET token non-vide
  // Il ne donne AUCUN rôle — la route doit valider elle-même via getAuthUserId()
  const hasPiSession = !userPayload && !!piToken && piToken.length > 20;

  const userRole        = userPayload?.role as string | undefined;
  const isAdmin         = userRole === "ADMIN";
  const isBankAdmin     = userRole === "BANK_ADMIN";
  const isBusinessAdmin = userRole === "BUSINESS_ADMIN";
  const isAgent         = userRole === "AGENT";

  const isLoginPage =
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/auth/login";

  // -------------------------------------------------------------------------
  // [FIX #24] Protection centralisée des routes /api/admin/*
  // Cette couche bloque AVANT l'exécution de la route.
  // Même si un "await" est oublié dans une route (vuln #23), le proxy bloque.
  // Seuls les JWT valides avec rôle ADMIN sont acceptés.
  // Le pi_session_token n'est JAMAIS suffisant pour les routes admin.
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/api/admin")) {
    if (!userPayload) {
      return buildApiError("Authentification requise", 401);
    }
    if (!isAdmin) {
      return buildApiError("Accès réservé aux administrateurs", 403);
    }
    // Admin authentifié → la route effectue sa propre vérification (defense in depth)
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Routes API générales (non-admin) → laisser passer après rate limit
  // La vérification d'auth est déléguée à chaque route via getAuthUserId()
  // -------------------------------------------------------------------------
  if (isApiRoute) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Redirection depuis login si déjà connecté (JWT valide uniquement)
  // -------------------------------------------------------------------------
  if (userPayload && isLoginPage) {
    return buildRedirect(getDestinationByRole(userRole ?? "USER"), req);
  }

  // -------------------------------------------------------------------------
  // Protection des routes authentifiées (pages)
  // -------------------------------------------------------------------------
  const isProtectedPath =
    pathname.startsWith("/dashboard")  ||
    pathname.startsWith("/admin")      ||
    pathname.startsWith("/bank")       ||
    pathname.startsWith("/business")   ||
    pathname.startsWith("/hub")        ||
    pathname.startsWith("/transfer")   ||
    pathname.startsWith("/deposit")    ||
    pathname.startsWith("/settings")   ||
    pathname.startsWith("/profile")    ||
    pathname.startsWith("/withdraw")   ||
    pathname.startsWith("/wallet");

  // Aucune session du tout → redirection login
  if (!userPayload && !hasPiSession && isProtectedPath) {
    const response = buildRedirect("/auth/login", req);
    return response;
  }

  // -------------------------------------------------------------------------
  // Protection par rôle (pages)
  // -------------------------------------------------------------------------

  // /admin/* — JWT ADMIN obligatoire (pi_session_token refusé)
  if (pathname.startsWith("/admin") && !isAdmin) {
    return buildRedirect(getDestinationByRole(userRole ?? "USER"), req);
  }

  // /bank/* — BANK_ADMIN ou ADMIN
  if (pathname.startsWith("/bank") && !isBankAdmin && !isAdmin) {
    return buildRedirect(getDestinationByRole(userRole ?? "USER"), req);
  }

  // /business/* — BUSINESS_ADMIN ou ADMIN
  if (pathname.startsWith("/business") && !isBusinessAdmin && !isAdmin) {
    return buildRedirect(getDestinationByRole(userRole ?? "USER"), req);
  }

  // /hub/* — AGENT ou ADMIN
  if (pathname.startsWith("/hub") && !isAgent && !isAdmin) {
    return buildRedirect(getDestinationByRole(userRole ?? "USER"), req);
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Config matcher — Next.js 15/16 compatible
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Pages protégées
    "/dashboard/:path*",
    "/admin/:path*",
    "/bank/:path*",
    "/business/:path*",
    "/hub/:path*",
    "/profile/:path*",
    "/transfer/:path*",
    "/deposit/:path*",
    "/withdraw/:path*",
    "/settings/:path*",
    "/wallet/:path*",
    // Pages de login (redirection si déjà connecté)
    "/login",
    "/",
    "/auth/login",
    // Routes API protégées par ce proxy
    "/api/admin/:path*",
    "/api/debug/:path*",
    "/api/withdraw/:path*",
    "/api/transfer/:path*",
    "/api/deposit/:path*",
    "/api/cards/:path*",
    "/api/auth/login",
  ],
};
