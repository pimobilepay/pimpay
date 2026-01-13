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
  
  // 1. ÉTATS DE MAINTENANCE
  const maintenanceCookie = req.cookies.get("maintenance_mode")?.value;
  const maintenanceUntil = req.cookies.get("maintenance_until")?.value;
  const hasBypassCookie = req.cookies.has("admin_bypass");

  let isMaintenanceModeActive = maintenanceCookie === "true";

  // Vérification expiration maintenance
  if (isMaintenanceModeActive && maintenanceUntil) {
    const now = new Date().getTime();
    const expiry = new Date(maintenanceUntil).getTime();
    if (now > expiry) {
      isMaintenanceModeActive = false;
    }
  }

  // Routes types
  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";
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
      // Token invalide : Suppression et redirection login
      if (!isAuthPage && !isMaintenancePage && !isPublicAsset) {
        const response = NextResponse.redirect(new URL("/auth/login", req.url));
        response.cookies.delete("token");
        return response;
      }
    }
  }

  const isAdmin = userPayload?.role === "ADMIN";

  // 3. LOGIQUE MAINTENANCE (Priorité maximale)
  if (isMaintenanceModeActive && !isMaintenancePage && !isUnlockPath && !isPublicAsset) {
    // Si pas Admin et pas de Bypass -> Direction Maintenance
    if (!isAdmin && !hasBypassCookie) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // 4. LOGIQUE POUR UTILISATEURS CONNECTÉS
  if (userPayload) {
    // Rediriger loin des pages Auth vers le Dashboard
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Protection routes Admin
    if (isAdminPath && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Sortir de la page maintenance si elle n'est plus active
    if (!isMaintenanceModeActive && isMaintenancePage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 5. LOGIQUE POUR UTILISATEURS NON CONNECTÉS
  if (!userPayload && !isAuthPage && !isMaintenancePage && !isUnlockPath && !isPublicAsset) {
    const dest = isMaintenanceModeActive && !hasBypassCookie ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // 6. FINALISATION ET NETTOYAGE
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
     * Match all request paths except for:
     * - api routes (handled internally)
     * - _next/static, _next/image
     * - common public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|images|assets).*)",
  ],
};
