// app/api/admin/tickets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
function getToken(req: Request){ const cookie = req.headers.get("cookie") || ""; return cookie.split("pimpay_token=")[1]?.split(";")[0]; }

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }});
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { userId, subject, message } = await req.json();
  const ticket = await prisma.supportTicket.create({ data: { userId, subject }});
  await prisma.message.create({ data: { ticketId: ticket.id, senderId: decoded.id, content: message }});
  return NextResponse.json({ ticket }, { status: 201 });
}
