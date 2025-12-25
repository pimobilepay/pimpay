import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const isMaintenance = req.cookies.get("maintenance_mode")?.value === "true";
  const { pathname } = req.nextUrl;

  // 1. Autoriser immédiatement les fichiers statiques et API internes
  if (
    pathname.startsWith("/_next") || 
    pathname.startsWith("/api") || 
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";

  // 2. Si l'utilisateur a un token
  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      const userRole = payload.role as string;

      // Rediriger loin des pages d'auth s'il est déjà connecté
      if (isAuthPage) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Logique de Maintenance
      if (isMaintenance) {
        if (userRole !== "ADMIN" && !isMaintenancePage) {
          return NextResponse.redirect(new URL("/maintenance", req.url));
        }
      } else if (isMaintenancePage) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Protection Admin
      if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next();
    } catch (e) {
      // Token invalide ou expiré : On nettoie et on redirige
      const response = NextResponse.redirect(new URL("/auth/login", req.url));
      response.cookies.delete("token");
      return response;
    }
  }

  // 3. Si l'utilisateur n'a PAS de token
  if (!token) {
    // Permettre l'accès aux pages d'auth et à la page maintenance
    if (isAuthPage || isMaintenancePage) {
      return NextResponse.next();
    }

    // Si maintenance active -> /maintenance, sinon -> /login
    const redirectUrl = isMaintenance ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
