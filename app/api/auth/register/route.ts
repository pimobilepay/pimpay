// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setTokenCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password, name, country } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await prisma.user.findUnique({
      where: { phone },
    });

    if (userExists) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    // Hash du mot de passe
    const hashed = await hashPassword(password);

    // Création user
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashed,
        name,
        country,
        role: "USER",
        wallets: {
          create: {
            type: "PI",
            currency: "PI",
            balance: 0,
          },
        },
      },
    });

    // Token JWT
    const token = signToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    const res = NextResponse.json({
      message: "User registered successfully",
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });

    setTokenCookie(res.headers, token);

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
