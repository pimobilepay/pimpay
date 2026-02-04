import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";
import * as jose from "jose";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 1. Récupération du token (On utilise "token" comme nom universel)
  const token = req.cookies.get("token")?.value;

  // 2. EXCLUSIONS : On ne bloque JAMAIS ces routes
  const isPublicAsset = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }

  // 3. VÉRIFICATION DU JWT
  let userPayload: any = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userPayload = payload;
    } catch (e) {
      // Token invalide ou expiré -> on nettoie et on redirige vers l'accueil
      const res = NextResponse.redirect(new URL("/", req.url));
      res.cookies.delete("token");
      return res;
    }
  }

  // 4. LOGIQUE DE REDIRECTION
  const isAdmin = userPayload?.role === "ADMIN";

  // Si connecté et sur login -> redirection vers dashboard
  if (userPayload && isLoginPage) {
    const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Si NON connecté et tente d'aller sur dashboard -> retour accueil
  if (!userPayload && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
