// app/api/admin/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return cookie.split("pimpay_token=")[1]?.split(";")[0];
}

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const q = new URL(req.url).searchParams;
  const take = Number(q.get("take") || 100);
  const txs = await prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take, include: { fromUser: true, toUser: true }});
  return NextResponse.json({ transactions: txs });
}

export async function DELETE(req: Request) {
  // optional: delete transaction (audit first)
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.transaction.delete({ where: { id }});
  return NextResponse.json({ ok: true });
}
