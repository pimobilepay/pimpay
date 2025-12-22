import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Décoder le token pour récupérer l'ID utilisateur
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    const userId = decoded.id;

    const body = await req.json();
    const { firstName, lastName, username, name, email, phone, country, birthDate } = body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        username,
        name,
        email,
        phone,
        country,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        birthDate: true,
        createdAt: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
