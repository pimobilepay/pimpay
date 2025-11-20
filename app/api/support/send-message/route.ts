export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
function getUserIdFromAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return null;
  try { /* @ts-ignore */ return jwt.verify(m[1], JWT_SECRET || "").userId; } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ticketId, content } = await req.json();
    if (!ticketId || !content) return NextResponse.json({ error: "Missing" }, { status: 400 });

    const msg = await prisma.message.create({
      data: {
        ticketId,
        senderId: userId,
        content,
      },
    });

    return NextResponse.json({ ok: true, msg });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
