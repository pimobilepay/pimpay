import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

/**
 * proxy.ts — Point d'entrée unique Next.js 15/16 (racine du projet)
 *
 * Fusion de l'ancien proxy.ts (racine) et lib/proxy.ts :
 *   - Vérification JWT et gestion des sessions Pi
 *   - Redirection selon le rôle utilisateur
 *   - Protection des routes authentifiées
 *   - Blocage des routes /api/debug/* en production
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDestinationByRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "BANK_ADMIN":
      return "/bank";
    case "BUSINESS_ADMIN":
      return "/business";
    case "AGENT":
      return "/hub";
    default:
      return "/dashboard";
  }
}

async function verifyJWT(token: string): Promise<jose.JWTPayload | null> {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) return null;
  try {
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Proxy principal
// ---------------------------------------------------------------------------

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Bloquer les routes debug en production
  if (
    pathname.startsWith("/api/debug") &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const token =
    req.cookies.get("token")?.value ||
    req.cookies.get("pimpay_token")?.value;
  const piToken = req.cookies.get("pi_session_token")?.value;

  const isPublicAsset = /\.(png|jpg|jpeg|gif|svg|ico|css|js)$/.test(pathname);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isLoginPage =
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/auth/login";

  // Laisser passer les assets et les API (sauf /api/debug bloqué ci-dessus)
  if (isPublicAsset || isAuthApi || isApiRoute) {
    return NextResponse.next();
  }

  let userPayload: jose.JWTPayload | null = null;

  if (token) {
    userPayload = await verifyJWT(token);
    if (!userPayload && !piToken) {
      const res = NextResponse.next();
      res.cookies.delete("token");
      res.cookies.delete("pimpay_token");
      return res;
    }
  }

  // Pi session token (non signé — traité comme USER simple)
  if (!userPayload && piToken && piToken.length > 20) {
    userPayload = { id: piToken, role: "USER", isPi: true };
  }

  const userRole = userPayload?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";
  const isBankAdmin = userRole === "BANK_ADMIN";
  const isBusinessAdmin = userRole === "BUSINESS_ADMIN";
  const isAgent = userRole === "AGENT";

  // Redirection depuis login si déjà connecté
  if (userPayload && isLoginPage) {
    const dest = getDestinationByRole(userRole ?? "USER");
    const response = NextResponse.redirect(new URL(dest, req.url), 302);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // Protection des routes authentifiées
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/bank") ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/hub") ||
    pathname.startsWith("/transfer") ||
    pathname.startsWith("/deposit") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/withdraw") ||
    pathname.startsWith("/wallet");

  if (!userPayload && isProtectedPath) {
    const response = NextResponse.redirect(
      new URL("/auth/login", req.url),
      302
    );
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  // Protection par rôle
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(
      new URL(getDestinationByRole(userRole ?? "USER"), req.url)
    );
  }

  if (pathname.startsWith("/bank") && !isBankAdmin && !isAdmin) {
    return NextResponse.redirect(
      new URL(getDestinationByRole(userRole ?? "USER"), req.url)
    );
  }

  if (pathname.startsWith("/business") && !isBusinessAdmin && !isAdmin) {
    return NextResponse.redirect(
      new URL(getDestinationByRole(userRole ?? "USER"), req.url)
    );
  }

  if (pathname.startsWith("/hub") && !isAgent && !isAdmin) {
    return NextResponse.redirect(
      new URL(getDestinationByRole(userRole ?? "USER"), req.url)
    );
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Config matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
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
    "/login",
    "/",
    "/auth/login",
    "/api/admin/:path*",
    "/api/debug/:path*",
  ],
};
