// app/api/admin/kyc/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getToken(req: Request) { const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const users = await prisma.user.findMany({ where: { kycStatus: { not: "NONE" }}, orderBy: { updatedAt: "desc" }});
  return NextResponse.json({ users });
}
