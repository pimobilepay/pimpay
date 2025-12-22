// app/api/auth/verify-pin/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function POST(req: Request) {
  try {
    const { userId, pin } = await req.json();

    if (!userId || !pin) {
      return NextResponse.json({ error: "userId et PIN sont requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    // Si c'est un admin, on ne vérifie pas le PIN
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin n’a pas besoin de vérifier le PIN" }, { status: 400 });
    }

    // Vérification du PIN hashé
    if (!user.pin || !(await bcrypt.compare(pin, user.pin))) {
      return NextResponse.json({ error: "PIN invalide" }, { status: 401 });
    }

    // PIN correct -> générer le JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Création de la session
    const ua = req.headers.get("user-agent") || "Unknown";
    const ip = req.headers.get("x-forwarded-for") || "Unknown";

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ip,
        os: ua.includes("Android") ? "Android" : ua.includes("iPhone") ? "iOS" : "Unknown",
        browser: ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : "Other",
        platform: /mobile/i.test(ua) ? "Mobile" : "Desktop",
        userAgent: ua,
        deviceName: ua.split(" ")[0] || "Unknown",
        country: "Congo", // tu peux récupérer dynamiquement si besoin
        isActive: true,
      },
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
