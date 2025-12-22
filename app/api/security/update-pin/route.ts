import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET n'est pas défini");

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { newPin } = await req.json();
    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "PIN invalide" }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);

    await prisma.user.update({
      where: { id: payload.id },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ message: "PIN mis à jour avec succès" });
  } catch (err: any) {
    console.error("UPDATE PIN ERROR:", err.message || err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
