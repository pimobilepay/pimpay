// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { signJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await comparePassword(password, user.password);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = signJwt({ sub: user.id, email: user.email });
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set("pimpay_token", token, { httpOnly: true, path: "/", maxAge: 7 * 24 * 60 * 60 });
  return res;
}
