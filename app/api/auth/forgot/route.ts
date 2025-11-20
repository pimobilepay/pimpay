export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendSMS } from "@/lib/sms";

const OTP_EXPIRE_MIN = parseInt(process.env.OTP_EXPIRE_MIN || "5", 10);

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    // find user by phone
    const user = await prisma.user.findUnique({ where: { phone } });

    // generate OTP
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MIN * 60 * 1000);

    // upsert into otp table (or create if not exists)
    // adapt model name: use `otp` table in schema
    await prisma.oTP.upsert({
      where: { phone },
      update: { code, expiresAt },
      create: { phone, code, expiresAt },
    }).catch(() => { /* if model missing, ignore */ });

    // send SMS
    const text = `Your PIMPAY verification code is: ${code}. It expires in ${OTP_EXPIRE_MIN} minutes.`;
    try {
      await sendSMS(phone, text);
    } catch (err) {
      console.error("SMS send failed:", err);
      return NextResponse.json({ error: "SMS send failed" }, { status: 500 });
    }

    // don't reveal user existence
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
