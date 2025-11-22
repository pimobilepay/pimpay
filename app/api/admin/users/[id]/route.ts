// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return cookie.split("pimpay_token=")[1]?.split(";")[0];
}

export async function GET(req: Request, { params }: { params: { id: string }}) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = params.id;
  const user = await prisma.user.findUnique({ where: { id }, include: { wallets: true }});
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PUT(req: Request, { params }: { params: { id: string }}) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = params.id;
  const body = await req.json();
  const { name, email, role, status } = body;
  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role, status },
  });
  return NextResponse.json({ user });
}

export async function DELETE(req: Request, { params }: { params: { id: string }}) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = params.id;
  await prisma.user.delete({ where: { id }});
  return NextResponse.json({ ok: true });
}
