// app/api/user/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Import nommé correspondant à votre fichier lib
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification de l'authentification
    // @ts-ignore
    const payload = await verifyAuth(req);

    // On vérifie si payload existe et contient un ID
    if (!payload || !payload.id) {
      console.error("AUTH_FAILED: Payload vide ou invalide");
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 2. Extraction sécurisée du body
    const body = await req.json();
    
    // 3. Mise à jour (On utilise prisma.user et non prisma.user.update sur un objet inexistant)
    // On s'assure que prisma existe avant d'appeler .user
    if (!prisma) {
      throw new Error("Prisma client is not initialized");
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: {
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        username: body.username ?? undefined,
        email: body.email ?? undefined,
        country: body.country ?? undefined,
        city: body.city ?? undefined,
        address: body.address ?? undefined,
        nationality: body.nationality ?? undefined,
        walletAddress: body.walletAddress ?? undefined,
        // Conversion de la date
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      },
    });

    // Suppression du mot de passe pour la réponse
    const { password: _, ...userResponse } = updatedUser as any;

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès",
      user: userResponse
    });

  } catch (error: any) {
    console.error("UPDATE_PROFILE_ERROR_FULL:", error);

    // Gestion d'erreur Prisma si l'utilisateur n'existe pas
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour", details: error.message }, 
      { status: 500 }
    );
  }
}
