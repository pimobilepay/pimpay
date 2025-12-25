import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose"; // Utilisation de jose pour le middleware (Edge Runtime)

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // 1. Autoriser les requêtes API et les fichiers statiques
  if (pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // 2. Pages publiques (Login, Register)
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) {
    if (token) {
      try {
        // Si déjà connecté, rediriger vers le dashboard
        await jose.jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/", req.url));
      } catch (e) {
        // Token invalide, on laisse l'utilisateur sur la page login
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 3. Pages protégées (Dashboard, Wallet, etc.)
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    await jose.jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    // Si le token est expiré ou corrompu, retour au login
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

// Configurer sur quelles routes le middleware s'applique
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
