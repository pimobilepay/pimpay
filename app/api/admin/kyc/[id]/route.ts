// app/api/admin/kyc/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getToken(req: Request) { const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = params.id;
  const { action } = await req.json(); // 'approve' | 'reject'
  if (!["approve","reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { kycStatus: action === "approve" ? "VERIFIED" : "REJECTED" }
  });

  return NextResponse.json({ user });
}
