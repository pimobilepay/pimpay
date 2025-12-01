import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = match[1];
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const totalUsers = await prisma.user.count();
    const totalMessages = await prisma.message.count();

    const messagesToday = await prisma.message.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const topUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        messages: {
          _count: "desc",
        },
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalMessages,
        messagesToday,
        topUsers,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
