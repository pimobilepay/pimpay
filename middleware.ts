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
  
  // 1. RÉCUPÉRATION DES ÉTATS DE MAINTENANCE
  const maintenanceCookie = req.cookies.get("maintenance_mode")?.value;
  const maintenanceUntil = req.cookies.get("maintenance_until")?.value;
  
  let isMaintenanceModeActive = maintenanceCookie === "true";

  // VÉRIFICATION AUTOMATIQUE DE LA DATE DE FIN
  if (isMaintenanceModeActive && maintenanceUntil) {
    const now = new Date().getTime();
    const expiry = new Date(maintenanceUntil).getTime();
    
    // Si la date actuelle a dépassé la date de fin prévue
    if (now > expiry) {
      isMaintenanceModeActive = false;
      // On laisse passer et on nettoiera les cookies via une réponse plus tard
    }
  }

  // PORTE DÉROBÉE (BACKDOOR)
  const hasBypassCookie = req.cookies.has("admin_bypass");

  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";
  const isAdminPath = pathname.startsWith("/admin");
  const isUnlockPath = pathname.startsWith("/api/unlock");

  // 2. GESTION DU TOKEN ET DU RÔLE
  let userPayload: any = null;
  if (token) {
    try {
      const secret = getJwtSecret();
      if (secret) {
        const { payload } = await jose.jwtVerify(token, secret);
        userPayload = payload;
      }
    } catch (e) {
      // Token invalide ou expiré : redirection propre
      if (!isAuthPage && !isMaintenancePage && !isUnlockPath) {
        const response = NextResponse.redirect(new URL("/auth/login", req.url));
        response.cookies.delete("token");
        return response;
      }
    }
  }

  // 3. PRIORITÉ : MODE MAINTENANCE
  // On laisse passer si : Admin, Bypass, ou route spéciale
  if (isMaintenanceModeActive && !isMaintenancePage && !isUnlockPath) {
    const isAdmin = userPayload?.role === "ADMIN";

    if (!isAdmin && !hasBypassCookie) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // 4. LOGIQUE POUR UTILISATEURS CONNECTÉS
  if (userPayload) {
    // Empêcher l'accès aux pages de login si déjà connecté
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Protection stricte des routes Admin
    if (isAdminPath && userPayload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Sortir de la page maintenance si elle n'est plus active (ou expirée)
    if (!isMaintenanceModeActive && isMaintenancePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 5. LOGIQUE POUR UTILISATEURS NON CONNECTÉS
  if (!userPayload && !isAuthPage && !isMaintenancePage && !isUnlockPath) {
    // Si maintenance active, envoyer vers maintenance, sinon vers login
    const dest = isMaintenanceModeActive && !hasBypassCookie ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // 6. NETTOYAGE DES COOKIES SI LA MAINTENANCE EST EXPIRÉE
  const res = NextResponse.next();
  if (maintenanceCookie === "true" && !isMaintenanceModeActive) {
    res.cookies.delete("maintenance_mode");
    res.cookies.delete("maintenance_until");
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|images|assets|favicon.ico|logo.png).*)",
  ],
};
