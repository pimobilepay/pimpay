// app/api/auth/forgot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true }); // don't reveal

  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  const expiry = new Date(Date.now() + 1000 * 60 * 10); // 10 min

  await prisma.user.update({
    where: { email },
    data: { otpCode: otp, otpExpiry: expiry },
  });

  // send OTP by email / SMS: for now, console.log or use nodemailer
  // Example: use nodemailer in production
  console.log(`OTP for ${email}: ${otp}`);

  return NextResponse.json({ ok: true });
}
