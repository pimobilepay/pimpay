import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const isMaintenanceModeActive = req.cookies.get("maintenance_mode")?.value === "true";

  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";
  const isAdminPath = pathname.startsWith("/admin");

  // 1. GESTION DU TOKEN ET DU RÔLE
  let userPayload: any = null;
  if (token) {
    try {
      const secret = getJwtSecret();
      if (secret) {
        const { payload } = await jose.jwtVerify(token, secret);
        userPayload = payload;
      }
    } catch (e) {
      // Token invalide : on nettoie et on laisse la logique de redirection s'occuper du reste
      const response = NextResponse.redirect(new URL("/auth/login", req.url));
      response.cookies.delete("token");
      return response;
    }
  }

  // 2. PRIORITÉ : MODE MAINTENANCE
  if (isMaintenanceModeActive && !isAdminPath && !isMaintenancePage) {
    // Si l'utilisateur est ADMIN, il peut ignorer la maintenance
    if (userPayload?.role === "ADMIN") {
      return NextResponse.next();
    }
    // Sinon, direction la page maintenance
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  // 3. LOGIQUE POUR UTILISATEURS CONNECTÉS
  if (userPayload) {
    // Empêcher l'accès aux pages de login/register si déjà connecté
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Protection stricte des routes Admin
    if (isAdminPath && userPayload.role !== "ADMIN") {
      return NextResponse.next(); // Ou redirection vers accueil
    }
    // Sortir de la page maintenance si elle n'est plus active
    if (!isMaintenanceModeActive && isMaintenancePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 4. LOGIQUE POUR UTILISATEURS NON CONNECTÉS
  if (!userPayload && !isAuthPage && !isMaintenancePage) {
    // Si pas de token et qu'on n'est pas sur une page publique -> Login
    const dest = isMaintenanceModeActive ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

// Configuration du Matcher pour exclure TOUS les fichiers statiques et API
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * 1. /api (routes d'API)
     * 2. /_next/static (fichiers statiques)
     * 3. /_next/image (optimisation d'images Next.js)
     * 4. Tous les fichiers avec une extension (ex: .png, .jpg, .svg)
     */
    "/((?!api|_next/static|_next/image|.*\\..*|favicon.ico).*)",
  ],
};
