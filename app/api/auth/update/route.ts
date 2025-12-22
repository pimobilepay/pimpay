import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function PUT(req: Request) {
  try {
    const token = cookies().get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, username, email, phone, country, birthDate } = body;

    // Préparation de l'objet de mise à jour
    const dataToUpdate: any = {
      firstName,
      lastName,
      username,
      // On reconstruit le champ 'name' automatiquement à partir de firstName et lastName
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      country,
    };

    // Gestion propre de la date
    if (birthDate && birthDate !== "") {
      const dateObj = new Date(birthDate);
      if (!isNaN(dateObj.getTime())) {
        dataToUpdate.birthDate = dateObj;
      }
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
    
    // Gestion spécifique des erreurs Prisma (ex: doublon de username ou email)
    if (err.code === 'P2002') {
      return NextResponse.json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé" }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}
