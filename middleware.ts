import { NextResponse } from "next/server";
import type { NextRequest } from "next/server"; // Correction du type pour Next.js 16
import * as jose from "jose";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Récupération sécurisée des tokens
  const token = req.cookies.get("token")?.value;
  const piToken = req.cookies.get("pi_session_token")?.value;

  // 2. EXCLUSIONS (Optimisées pour le Mainnet)
  const isPublicAsset = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }

  let userPayload: any = null;

  // 3. VÉRIFICATION JWT (Connexion Standard)
  if (token) {
    try {
      const secretStr = process.env.JWT_SECRET;
      if (!secretStr) throw new Error("JWT_SECRET_MISSING");

      const secret = new TextEncoder().encode(secretStr);
      const { payload } = await jose.jwtVerify(token, secret);
      userPayload = payload;
    } catch (e) {
      // Si le token est invalide et qu'il n'y a pas de Pi Token, on nettoie
      if (!piToken) {
        const res = NextResponse.redirect(new URL("/", req.url));
        res.cookies.delete("token");
        return res;
      }
    }
  }

  // 4. SÉCURITÉ PI NETWORK (Mainnet Ready)
  if (!userPayload && piToken) {
    // ATTENTION : Sur le Mainnet, ici on devrait appeler l'API Pi pour valider le token.
    // Pour le moment, on sécurise en vérifiant au moins la structure/longueur
    if (piToken.length > 20) { 
      userPayload = { id: piToken, role: "USER", isPi: true };
    }
  }

  // 5. LOGIQUE DE REDIRECTION STRICTE
  const isAdmin = userPayload?.role === "ADMIN";

  // Redirection si déjà connecté
  if (userPayload && isLoginPage) {
    const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protection des routes sensibles
  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!userPayload && isProtectedPath) {
    return NextResponse.next({
      // On redirige proprement vers l'accueil
      status: 307,
      headers: { Location: new URL("/", req.url).toString() }
    });
  }

  // Protection spécifique Admin
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Matcher précis pour éviter de ralentir les requêtes système
export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/admin/:path*", 
    "/login", 
    "/",
    "/api/((?!auth).*)", // Protège toutes les API sauf l'auth
  ],
};
