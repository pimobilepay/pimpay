// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split("pimpay_token=")[1]?.split(";")[0];

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const decoded: any = verifyToken(token);
  if (!decoded) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  return NextResponse.json({ user });
}
