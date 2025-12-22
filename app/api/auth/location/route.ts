import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const payload: any = jwt.verify(token!, JWT_SECRET);

  const { latitude, longitude } = await req.json();

  await prisma.user.update({
    where: { id: payload.id },
    data: { latitude, longitude },
  });

  return NextResponse.json({ success: true });
}
