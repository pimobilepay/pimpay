// app/api/auth/set-pin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { verifyJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  const { pin } = await req.json();
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "") || null;

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = verifyJwt<{ sub: string }>(token);
    if (!payload?.sub) throw new Error("Invalid token");

    if (!pin || pin.length !== 4) return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    const hashedPin = await hashPassword(pin);

    await prisma.user.update({ where: { id: payload.sub }, data: { pin: hashedPin } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
