import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/);

    if (!match)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = match[1];
    const payload = verifyToken(token);

    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
