import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split(" ")[1];
    const payload: any = jwt.verify(token, JWT_SECRET);

    const { pin } = await req.json();
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: "PIN invalide" }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: { id: payload.id },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("SET PIN ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
