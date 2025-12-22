export const dynamic = 'force-dynamic';
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.split(" ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      console.error("Invalid JWT:", e);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where: { userId: payload.id },
      orderBy: { lastActiveAt: "desc" },
    });

    const devices = sessions.map((s) => ({
      id: s.id,
      name: s.deviceName,
      os: s.os,
      browser: s.browser,
      ip: s.ip,
      location: s.location,
      lastActive: s.lastActiveAt.toLocaleString(),
      current: s.token === token,
    }));

    return NextResponse.json({ devices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
