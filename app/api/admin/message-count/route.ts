import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { adminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await auth().catch(() => null);
    const admin = await adminAuth(req).catch(() => null);
    const role = sessionUser?.role || admin?.role;

    if (!role) return NextResponse.json({ count: 0 }, { status: 401 });

    const count = await prisma.message.count({
      where: {
        ticket: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        ...(role === "ADMIN"
          ? { senderId: { notIn: ["SUPPORT", "ELARA_AI"] } }
          : { senderId: "SUPPORT" }),
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[MESSAGE_COUNT_ERROR]", error);
    return NextResponse.json({ count: 0 });
  }
}
