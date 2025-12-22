import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // named export
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET n'est pas défini");

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: "PIN invalide" }, { status: 400 });
    }

    // Récupérer le token dans l'header Authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Vérifier le token
    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { pin: true },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou PIN non défini" }, { status: 404 });
    }

    // Comparer le PIN fourni avec celui enregistré
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return NextResponse.json({ error: "PIN incorrect" }, { status: 400 });
    }

    return NextResponse.json({ message: "PIN correct" }, { status: 200 });
  } catch (err) {
    console.error("VERIFY PIN ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
