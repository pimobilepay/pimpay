import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const token = cookies().get("token")?.value || req.headers.get("authorization")?.split(" ")[1];

    if (!token) return NextResponse.json({ error: "Session absente" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.id || payload.userId || payload.sub) as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true }
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "PIN non configuré" }, { status: 403 });
    }

    // LOG DE DEBUG (À supprimer après test)
    console.log("PIN saisi:", pin);
    console.log("PIN en DB (Haché):", user.pin);

    // Comparaison
    const isMatch = await bcrypt.compare(pin.toString(), user.pin);

    if (!isMatch) {
      console.log("Résultat: PIN Incorrect");
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur Verify:", error.message);
    return NextResponse.json({ error: "Erreur technique" }, { status: 401 });
  }
}

