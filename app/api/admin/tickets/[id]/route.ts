// app/api/admin/tickets/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
function getToken(req: Request){ const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const id = params.id;
  const { content, action } = await req.json(); // action optional: close
  await prisma.message.create({ data: { ticketId: id, senderId: decoded.id, content }});
  if (action === "close") await prisma.supportTicket.update({ where: { id }, data: { status: "CLOSED" }});
  return NextResponse.json({ ok: true });
}
