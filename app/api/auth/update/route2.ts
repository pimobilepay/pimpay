// app/api/auth/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export async function PUT(req: Request) {
  try {
    // 🔑 Récupérer le token depuis le cookie HttpOnly
    const token = cookies().get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { firstName, lastName, username, name, email, phone, country, birthDate } = await req.json();

    const dataToUpdate: any = {
      firstName,
      lastName,
      username,
      name,
      email,
      phone,
      country,
    };

    if (birthDate && birthDate !== "") {
      dataToUpdate.birthDate = new Date(birthDate);
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: dataToUpdate,
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
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err: any) {
    console.error("UPDATE USER ERROR:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}
