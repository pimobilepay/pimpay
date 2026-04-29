import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * SECURITY FIX [CRITIQUE] — Middleware Next.js 16
 *
 * Next.js 16 utilise toujours middleware.ts à la racine du projet
 * (même emplacement que Next.js 13/14/15). PAS de proxy.ts.
 * Le middleware s'exécute côté Edge Runtime AVANT que la page soit rendue,
 * ce qui rend la protection impossible à bypasser côté client.
 *
 * ⚠️  Ne jamais mettre de logique Prisma ici (Edge Runtime ne supporte pas TCP).
 *     On vérifie uniquement le JWT et le rôle depuis le payload signé.
 */

const JWT_SECRET = process.env.JWT_SECRET ?? "";

async function verifyAdminJWT(token: string): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}

function getToken(req: NextRequest): string | null {
  // 1. Cookie httpOnly (connexion normale)
  const cookieToken =
    req.cookies.get("pimpay_token")?.value ??
    req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  // 2. Header Authorization: Bearer <token> (API calls)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protection des pages /admin/* ──────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const token = getToken(req);
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isAdmin = await verifyAdminJWT(token);
    if (!isAdmin) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Protection des routes API /api/admin/* ─────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const isAdmin = await verifyAdminJWT(token);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Accès refusé — droits admin requis" },
        { status: 403 }
      );
    }
  }

  // ── Bloquer les routes debug en production ─────────────────────────────────
  if (
    pathname.startsWith("/api/debug") &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json(
      { error: "Route non disponible en production" },
      { status: 404 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/debug/:path*",
  ],
};
