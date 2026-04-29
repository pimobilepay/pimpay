import { NextRequest, NextResponse } from "next/server";
import { handleProxy } from "@/lib/proxy";

/**
 * middleware.ts — Point d'entrée unique Next.js 16
 *
 * Délègue toute la logique de routage/protection à lib/proxy.ts,
 * et ajoute par-dessus les corrections de sécurité du patch :
 *   - Blocage des routes /api/debug/* en production
 *   - Protection /api/admin/* (double sécurité avec la vérification dans adminAuth)
 */

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // ── Bloquer les routes debug en production ─────────────────────────────────
  if (
    pathname.startsWith("/api/debug") &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json(
      { error: "Not Found" },
      { status: 404 }
    );
  }

  // ── Toute la logique de routage et protection par rôle ────────────────────
  return handleProxy(req);
}

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
