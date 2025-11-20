// app/api/auth/set-pin/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserIdFromAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return null;
  const token = m[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET || ""); // will throw if missing
    // @ts-ignore
    return payload.userId || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pin } = await req.json();
    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return NextResponse.json({ error: "Invalid pin" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data: { pin } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
