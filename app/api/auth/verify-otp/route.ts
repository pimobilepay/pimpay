// app/api/auth/verify-otp/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // Example: look for an OTP table; if you don't have it, adapt
    const otp = await prisma.otp.findUnique({ where: { phone } }).catch(() => null);
    if (!otp || otp.code !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // mark verified or create user
    await prisma.otp.deleteMany({ where: { phone } }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
