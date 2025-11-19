import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = match[1];
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await req.json();

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
