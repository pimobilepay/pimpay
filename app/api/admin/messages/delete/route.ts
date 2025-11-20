// app/api/admin/messages/delete/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return null;
  try {
    // @ts-ignore
    return jwt.verify(m[1], JWT_SECRET || "");
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getUserFromAuth(req);
    if (!userPayload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.message.deleteMany({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
