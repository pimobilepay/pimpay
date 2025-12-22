export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";           import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";                                                              const JWT_SECRET = process.env.JWT_SECRET;        if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function GET() {
  try {                                               const token = cookies().get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: { id: string; role: "USER" | "ADMIN" };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string; role: "USER" | "ADMIN" };
    } catch (e) {
      console.error("Invalid JWT:", e);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const redirectTo = user.role === "ADMIN" ? "/admin/dashboard" : "/";

    return NextResponse.json({
      user,
      redirectTo,
    });
  } catch (err) {
    console.error("AUTH ME ERROR:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
