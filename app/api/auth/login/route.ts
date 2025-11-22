// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken, setTokenCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 }
      );
    }

    const match = await comparePassword(password, user.password);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 }
      );
    }

    // ----------------------------------
    // Créer le JWT avec rôle
    // ----------------------------------
    const token = signToken({
      id: user.id,
      email: user.email || null,
      phone: user.phone,
      role: user.role, // "admin" | "user"
    });

    // ----------------------------------
    // Réponse + cookie sécurisé
    // ----------------------------------
    const res = NextResponse.json({
      message: "Login success",
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });

    // Set cookie pimpay_token
    setTokenCookie(res.headers, token);

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
