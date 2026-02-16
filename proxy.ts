import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

// Dans Next 16, la fonction exportée doit s'appeler 'proxy'
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Récupération des tokens (vérifier tous les noms de cookies utilisés)
  const token = req.cookies.get("token")?.value || req.cookies.get("pimpay_token")?.value;
  const piToken = req.cookies.get("pi_session_token")?.value;

  // 2. EXCLUSIONS (On laisse passer les fichiers statiques et l'auth)
  const isPublicAsset = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }

  let userPayload: any = null;

  // 3. VÉRIFICATION JWT
  if (token) {
    try {
      const secretStr = process.env.JWT_SECRET;
      if (!secretStr) throw new Error("JWT_SECRET_MISSING");

      const secret = new TextEncoder().encode(secretStr);
      const { payload } = await jose.jwtVerify(token, secret);
      userPayload = payload;
    } catch (e) {
      if (!piToken) {
        const res = NextResponse.redirect(new URL("/", req.url));
        res.cookies.delete("token");
        return res;
      }
    }
  }

  // 4. SÉCURITÉ PI (Mainnet Ready)
  if (!userPayload && piToken && piToken.length > 20) {
    userPayload = { id: piToken, role: "USER", isPi: true };
  }

  // 5. REDIRECTIONS
  const isAdmin = userPayload?.role === "ADMIN";

  if (userPayload && isLoginPage) {
    const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/transfer") || pathname.startsWith("/deposit") || pathname.startsWith("/settings") || pathname.startsWith("/profile");
  if (!userPayload && isProtectedPath) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/",
    "/api/((?!auth).*)",
  ],
};
