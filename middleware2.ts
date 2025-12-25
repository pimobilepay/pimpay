import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const isMaintenance = req.cookies.get("maintenance_mode")?.value === "true";
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
        await jose.jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/", req.url));
      } catch (e) {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 3. Pages protégées
  if (!token) {
    // Si maintenance active et pas de token, on envoie vers maintenance plutôt que login
    if (isMaintenance && pathname !== "/maintenance") {
       return NextResponse.redirect(new URL("/maintenance", req.url));
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // --- LOGIQUE DE MAINTENANCE ---
    // Si le mode maintenance est ON, on redirige tout le monde sauf les ADMINS
    if (isMaintenance && pathname !== "/maintenance") {
      if (userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/maintenance", req.url));
      }
    }

    // Si l'utilisateur est sur la page maintenance alors qu'elle n'est plus active
    if (!isMaintenance && pathname === "/maintenance") {
      return NextResponse.redirect(new URL("/", req.url));
    }

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
