// app/api/admin/logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
function getToken(req: Request){ const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ logs });
}
