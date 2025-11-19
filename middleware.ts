// middleware.ts (Next.js)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "./lib/jwt";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("pimpay_token")?.value || null;
  const protectedPaths = ["/api/protected", "/dashboard"];

  if (protectedPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      verifyJwt(token);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}
