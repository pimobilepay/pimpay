export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return null;
  try {
    // @ts-ignore
    const payload = jwt.verify(m[1], JWT_SECRET || "");
    // @ts-ignore
    return payload.userId;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromAuth(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currency = "USD", type = "PI" } = await req.json();

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        currency,
        type: type as any,
        balance: 0,
      },
    });

    return NextResponse.json({ ok: true, wallet });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
