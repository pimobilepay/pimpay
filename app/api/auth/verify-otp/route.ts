export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRE_MIN = parseInt(process.env.OTP_EXPIRE_MIN || "5", 10);

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ error: "Missing" }, { status: 400 });

    const otp = await prisma.oTP.findUnique({ where: { phone } }).catch(() => null);
    if (!otp) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    if (otp.code !== String(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    if (new Date(otp.expiresAt) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 400 });

    // if user exists, sign token; otherwise optionally create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, status: "PENDING" as any },
      });
    }

    // remove OTP
    await prisma.oTP.deleteMany({ where: { phone } }).catch(() => null);

    // sign JWT
    if (!JWT_SECRET) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return NextResponse.json({ ok: true, token, user: { id: user.id, phone: user.phone } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
