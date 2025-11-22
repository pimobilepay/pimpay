// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("pimpay_token")?.value || null;
  const { pathname } = req.nextUrl;

  // Pages publiques
  const publicPaths = ["/login", "/register"];
  if (publicPaths.includes(pathname)) {
    if (token && verifyToken(token)) {
      // Déjà connecté → dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Pages protégées
  const protectedPaths = ["/dashboard", "/api/protected"];
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Zone admin
  if (pathname.startsWith("/admin")) {
    const decoded: any = token && verifyToken(token);

    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/not-authorized", req.url));
    }
  }

  return NextResponse.next();
}
