import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const payload = verifyAuth(req) as any;
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 2. Récupération de TOUS les champs du body
    const body = await req.json();
    const { 
      firstName, 
      lastName, 
      username, 
      email, 
      country, 
      city, 
      address,
      birthDate,
      nationality,
      walletAddress 
    } = body;

    // 3. Mise à jour dans la base de données
    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
        email: email || undefined,
        country: country || undefined,
        city: city || undefined,
        address: address || undefined,
        nationality: nationality || undefined,
        walletAddress: walletAddress || undefined,
        // Conversion de la date si elle est présente
        birthDate: birthDate ? new Date(birthDate) : undefined,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Profil mis à jour avec succès",
      user: updatedUser 
    });

  } catch (error: any) {
    console.error("UPDATE_PROFILE_ERROR:", error);
    
    // Gestion d'erreur spécifique (ex: username déjà pris)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé" }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }
}
