// app/api/auth/sessions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };

    const sessions = await prisma.session.findMany({
      where: { userId: payload.id },
      orderBy: { createdAt: "desc" },
    });

    const active = sessions.filter(s => s.isActive);
    const history = sessions.filter(s => !s.isActive);

    return NextResponse.json({
      active,
      history,
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
