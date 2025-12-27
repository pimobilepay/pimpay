import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("ERREUR: JWT_SECRET manquant.");
    return null;
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const isMaintenanceModeActive = req.cookies.get("maintenance_mode")?.value === "true";
  const { pathname } = req.nextUrl;

  // 1. Exceptions (Statique, API, Images)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";
  const isAdminPath = pathname.startsWith("/admin");

  // 2. GESTION DE LA MAINTENANCE (Priorité haute)
  if (isMaintenanceModeActive && !isMaintenancePage && !isAdminPath) {
    // Si maintenance active, on vérifie si l'utilisateur est admin pour le laisser passer
    if (token) {
      try {
        const secret = getJwtSecret();
        if (secret) {
          const { payload } = await jose.jwtVerify(token, secret);
          if (payload.role === "ADMIN") {
            return NextResponse.next(); // L'admin peut naviguer
          }
        }
      } catch (e) {
        // Token invalide en mode maintenance -> direction maintenance
      }
    }
    // Pour tous les autres (non connectés ou non admins) -> redirection
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  // 3. LOGIQUE SI UTILISATEUR CONNECTÉ
  if (token) {
    try {
      const secret = getJwtSecret();
      if (!secret) return NextResponse.next();

      const { payload } = await jose.jwtVerify(token, secret);
      const userRole = payload.role as string;

      // Rediriger les gens connectés qui vont sur /login ou /register vers l'accueil
      if (isAuthPage) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Protection des routes /admin
      if (isAdminPath && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Si maintenance est OFF mais qu'on est sur /maintenance, on libère l'utilisateur
      if (!isMaintenanceModeActive && isMaintenancePage) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next();
    } catch (e) {
      const response = NextResponse.redirect(new URL("/auth/login", req.url));
      response.cookies.delete("token");
      return response;
    }
  }

  // 4. LOGIQUE SI UTILISATEUR NON CONNECTÉ
  if (!token) {
    // Autoriser l'accès aux pages d'auth et à la page maintenance
    if (isAuthPage || isMaintenancePage) {
      return NextResponse.next();
    }

    // Sinon, redirection vers login (ou maintenance si actif)
    const destination = isMaintenanceModeActive ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|devices-pimpay.png).*)",
  ],
};
