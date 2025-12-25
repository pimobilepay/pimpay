export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        wallets: {
          where: { type: "PI" }
        }
      }
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Ce compte a été suspendu par l'administration" },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // ✅ FORCE L'ALGORITHME HS256 pour assurer la compatibilité avec Jose
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        address: user.walletAddress,
      },
      JWT_SECRET,
      { 
        algorithm: "HS256", 
        expiresIn: "7d" 
      }
    );

    // ✅ RÉGLAGE DU COOKIE
    // Note : Si tu es en développement local (http://localhost), 
    // "sameSite: none" + "secure: true" peut échouer sur certains navigateurs.
    // Mais pour la production/Pi Browser, c'est indispensable.
    const cookieStore = cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Auto-adaptatif
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN",
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      }
    }).catch(e => console.error("Log error:", e));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.walletAddress,
        balance: user.wallets[0]?.balance || 0
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion" },
      { status: 500 }
    );
  }
}
