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

    const { subject, message } = await req.json();
    if (!subject || !message) return NextResponse.json({ error: "Missing" }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        messages: {
          create: {
            senderId: userId,
            content: message,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
