export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose"; // ✅ Remplacement de jsonwebtoken

export async function PUT(req: Request) {
  try {
    // 1. SÉCURITÉ DU SECRET (Lazy-loading pour éviter le crash au build)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("JWT_SECRET is missing");
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    // 2. AUTHENTICATION VIA COOKIES
    const token = cookies().get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 3. VÉRIFICATION ASYNCHRONE AVEC JOSE
    let userId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      userId = payload.id as string;

      if (!userId) throw new Error("ID manquant dans le payload");
    } catch (err) {
      return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }

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

  } catch (err: any) {
    console.error("UPDATE USER ERROR:", err);

    // Gestion spécifique des erreurs de contrainte Prisma (P2002)
    if (err.code === 'P2002') {
      const target = err.meta?.target || "donnée";
      return NextResponse.json({ 
        error: `Ce champ (${target}) est déjà utilisé par un autre compte.` 
      }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}
