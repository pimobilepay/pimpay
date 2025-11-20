// app/api/auth/forgot/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // do not reveal existence
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { id: crypto.randomUUID(), userId: user.id, token, expiresAt },
    }).catch(() => { /* ignore if no model exists; create one in schema if needed */ });

    // TODO: send email with token (SMTP)
    // For now return ok
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
