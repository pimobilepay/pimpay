import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  try {
    const { newPin } = await req.json();

    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "Format PIN invalide" }, { status: 400 });
    }

    // Extraction sécurisée du token
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get("token")?.value;
    const authHeader = req.headers.get("authorization");
    const token = tokenCookie || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token || token === "undefined" || token === "null") {
      return NextResponse.json({ error: "Session non valide" }, { status: 401 });
    }

    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(token, secret);
      userId = (payload.id || payload.userId || payload.sub) as string;
    } catch (err) {
      return NextResponse.json({ error: "JWT malformé ou expiré" }, { status: 401 });
    }

    const hashedPin = await bcrypt.hash(newPin, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ success: true, message: "PIN mis à jour" });
  } catch (error: any) {
    console.error("UPDATE_PIN_FATAL_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
