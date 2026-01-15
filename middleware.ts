import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ [MIDDLEWARE] JWT_SECRET manquant !");
    return null;
  };
  return new TextEncoder().encode(secret);
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // 1. RÉCUPÉRATION DES ÉTATS (Cookies)
  const maintenanceCookie = req.cookies.get("maintenance_mode")?.value;
  const maintenanceUntil = req.cookies.get("maintenance_until")?.value;
  const comingSoonCookie = req.cookies.get("coming_soon_mode")?.value;
  const hasBypassCookie = req.cookies.has("admin_bypass");
  
  let isMaintenanceModeActive = maintenanceCookie === "true";
  const isComingSoonModeActive = comingSoonCookie === "true";

  if (isMaintenanceModeActive && maintenanceUntil) {
    const now = new Date().getTime();
    const expiry = new Date(maintenanceUntil).getTime();
    if (now > expiry) isMaintenanceModeActive = false;
  }

  // Définition des routes spéciales
  const isAuthPage = pathname.startsWith("/auth") || pathname === "/login" || pathname === "/";
  const isMaintenancePage = pathname === "/maintenance";
  const isComingSoonPage = pathname === "/coming-soon";
  const isAdminPath = pathname.startsWith("/admin");
  const isUnlockPath = pathname.startsWith("/api/unlock");
  const isPublicAsset = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/);

  // 2. VÉRIFICATION DU TOKEN
  let userPayload: any = null;
  if (token) {
    try {
      const secret = getJwtSecret();
      if (secret) {
        const { payload } = await jose.jwtVerify(token, secret);
        userPayload = payload;
      }
    } catch (e) {
      if (!isAuthPage && !isMaintenancePage && !isComingSoonPage && !isPublicAsset) {
        const response = NextResponse.redirect(new URL("/", req.url));
        response.cookies.delete("token");
        return response;
      }
    }
  }

  const isAdmin = userPayload?.role === "ADMIN";

  // 3. LOGIQUE DE PROTECTION (MAINTENANCE & COMING SOON)
  if (isMaintenanceModeActive && !isMaintenancePage && !isUnlockPath && !isPublicAsset) {
    if (!isAdmin && !hasBypassCookie) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  if (isComingSoonModeActive && !isComingSoonPage && !isMaintenancePage && !isUnlockPath && !isPublicAsset) {
    if (!isAdmin && !hasBypassCookie) {
      return NextResponse.redirect(new URL("/coming-soon", req.url));
    }
  }

  // 4. LOGIQUE POUR UTILISATEURS CONNECTÉS (CORRIGÉE POUR ADMIN)
  if (userPayload) {
    // Définition de la destination par défaut selon le rôle
    const userHome = isAdmin ? "/admin/dashboard" : "/dashboard";

    // Si l'utilisateur est sur une page de login/accueil alors qu'il est déjà connecté
    if (isAuthPage) {
      return NextResponse.redirect(new URL(userHome, req.url));
    }

    // Protection des routes Admin : si un simple USER tente d'entrer sur /admin
    if (isAdminPath && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Rediriger hors des pages de restriction si elles sont terminées
    if (!isMaintenanceModeActive && isMaintenancePage) {
      return NextResponse.redirect(new URL(userHome, req.url));
    }
    if (!isComingSoonModeActive && isComingSoonPage) {
      return NextResponse.redirect(new URL(userHome, req.url));
    }
  }

  // 5. LOGIQUE POUR UTILISATEURS NON CONNECTÉS
  if (!userPayload && !isAuthPage && !isMaintenancePage && !isComingSoonPage && !isUnlockPath && !isPublicAsset) {
    let dest = "/";
    if (isMaintenanceModeActive && !hasBypassCookie) dest = "/maintenance";
    else if (isComingSoonModeActive && !hasBypassCookie) dest = "/coming-soon";

    return NextResponse.redirect(new URL(dest, req.url));
  }

  // 6. FINALISATION
  const res = NextResponse.next();
  if (maintenanceCookie === "true" && !isMaintenanceModeActive) {
    res.cookies.delete("maintenance_mode");
    res.cookies.delete("maintenance_until");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|images|assets).*)",
  ],
};
