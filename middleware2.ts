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
  
  // PORTE DÉROBÉE (BACKDOOR)
  const hasBypassCookie = req.cookies.has("admin_bypass");

  const isAuthPage = pathname.startsWith("/auth");
  const isMaintenancePage = pathname === "/maintenance";
  const isAdminPath = pathname.startsWith("/admin");
  const isUnlockPath = pathname.startsWith("/api/unlock"); // On laisse passer la route de déblocage

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
      // Token invalide : on nettoie
      if (!isAuthPage && !isMaintenancePage && !isUnlockPath) {
        const response = NextResponse.redirect(new URL("/auth/login", req.url));
        response.cookies.delete("token");
        return response;
      }
    }
  }

  // 2. PRIORITÉ : MODE MAINTENANCE
  // On ignore la maintenance si : 
  // - On a le cookie bypass (Porte dérobée)
  // - On est déjà loggé en ADMIN
  // - On est sur la route /api/unlock
  if (isMaintenanceModeActive && !isMaintenancePage && !isUnlockPath) {
    const isAdmin = userPayload?.role === "ADMIN";
    
    if (!isAdmin && !hasBypassCookie) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // 3. LOGIQUE POUR UTILISATEURS CONNECTÉS
  if (userPayload) {
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Protection routes Admin
    if (isAdminPath && userPayload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url)); 
    }
    // Sortir de la page maintenance si elle n'est plus active
    if (!isMaintenanceModeActive && isMaintenancePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 4. LOGIQUE POUR UTILISATEURS NON CONNECTÉS
  if (!userPayload && !isAuthPage && !isMaintenancePage && !isUnlockPath) {
    const dest = isMaintenanceModeActive && !hasBypassCookie ? "/maintenance" : "/auth/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\..*|favicon.ico).*)",
  ],
};
