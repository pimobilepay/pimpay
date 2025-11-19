// app/api/auth/verify-otp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ error: "Missing" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otpCode || !user.otpExpiry) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (user.otpCode !== otp || user.otpExpiry < new Date()) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  // clear otp
  await prisma.user.update({ where: { email }, data: { otpCode: null, otpExpiry: null } });

  // issue token (for password reset flow or login)
  const token = signJwt({ sub: user.id, email: user.email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pimpay_token", token, { httpOnly: true, path: "/", maxAge: 60 * 10 }); // short lived
  return res;
}
