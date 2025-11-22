// app/api/admin/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
function getToken(req: Request){ const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Example: store settings in a simple table or env. Here we return env-driven defaults:
  return NextResponse.json({
    settings: {
      feePercent: Number(process.env.FEE_PERCENT || 0.02),
      feeFixed: Number(process.env.FEE_FIXED || 0.05),
      smtp: { host: process.env.SMTP_HOST || null }
    }
  });
}

export async function PUT(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  // TODO: persist to DB table if you created one called Setting
  // For now we echo back
  return NextResponse.json({ ok: true, settings: body });
}
