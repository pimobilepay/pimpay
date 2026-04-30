export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    // 1. AUTHENTICATION via lib/auth.ts
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = user.id;

    // 4. RÉCUPÉRATION ET VALIDATION DU BODY
    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, username, email, phone, country, birthDate } = body;

    // 5. PRÉPARATION DE L'OBJET DE MISE À JOUR (Robuste)
    const dataToUpdate: any = {
      firstName,
      lastName,
      username,
      // On reconstruit le champ 'name' dynamiquement
      name: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
      email,
      phone,
      country,
    };

    // Nettoyage des champs undefined pour ne pas écraser de données par erreur
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    // Gestion propre et robuste de la date
    if (birthDate && birthDate !== "") {
      const dateObj = new Date(birthDate);
      if (!isNaN(dateObj.getTime())) {
        dataToUpdate.birthDate = dateObj;
      }
    }

    // 6. MISE À JOUR PRISMA AVEC GESTION D'ERREURS DÉTAILLÉE
    const updatedUser = await prisma.user.update({
      where: { id: userId },
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

  } catch (err: unknown) {
    console.error("UPDATE USER ERROR:", err);

    // Gestion spécifique des erreurs de contrainte Prisma (P2002)
    const prismaErr = err as { code?: string; meta?: { target?: string } };
    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target || "donnée";
      return NextResponse.json({ 
        error: `Ce champ (${target}) est déjà utilisé par un autre compte.` 
      }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}
