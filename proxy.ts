import { NextRequest, NextResponse } from "next/server";
import { handleProxy } from "@/lib/proxy";

/**
 * proxy.ts — Point d'entrée unique Next.js 16
 * (Next.js 16 utilise proxy.ts à la racine, middleware.ts est déprécié)
 *
 * Délègue toute la logique à lib/proxy.ts et ajoute :
 *   - Blocage /api/debug/* en production
 */

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Bloquer les routes debug en production
  if (
    pathname.startsWith("/api/debug") &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

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
