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

    // On récupère l'utilisateur avec son Wallet PI inclus
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

    // Vérification du statut du compte
    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Ce compte a été suspendu par l'administration" },
        { status: 403 }
      );
    }

    // Vérification du mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Création du Token JWT avec l'adresse du wallet incluse
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        address: user.walletAddress 
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ CONFIGURATION OPTIMISÉE POUR PI BROWSER
    // 'sameSite: none' et 'secure: true' permettent au cookie de fonctionner 
    // à l'intérieur de l'iframe du Pi Browser.
    cookies().set("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "none", 
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    // Log de la connexion
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
