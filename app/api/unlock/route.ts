import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.ADMIN_BYPASS_TOKEN) {
    return new NextResponse("Accès refusé", { status: 403 });
  }

  // On dépose un cookie qui expire dans 24h
  (await cookies()).set("admin_bypass", "true", {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24, // 24 heures
    path: "/",
  });

  // Redirection vers le dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
