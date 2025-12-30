// app/api/user/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { verifyAuth } from "@/lib/adminAuth";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification de l'authentification
    // @ts-ignore
    const payload = await verifyAuth(req);  
    if (!payload || !payload.id) {
      console.error("AUTH_FAILED: Payload vide ou invalide");
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 2. Extraction sécurisée du body
    const body = await req.json();

    if (!prisma) {
      throw new Error("Prisma client is not initialized");
    }

    // 3. Vérification d'unicité pour walletAddress
    // Si une adresse est fournie, on vérifie qu'elle n'appartient pas déjà à quelqu'un d'autre
    if (body.walletAddress) {
      const existingWallet = await prisma.user.findFirst({
        where: {
          walletAddress: body.walletAddress.trim(),
          NOT: {
            id: payload.id,
          },
        },
      });

      if (existingWallet) {
        return NextResponse.json(
          { error: "Cette adresse de portefeuille est déjà utilisée par un autre compte." },
          { status: 400 }
        );
      }
    }

    // 4. Mise à jour du profil
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
        walletAddress: body.walletAddress ? body.walletAddress.trim() : undefined,
        // Conversion de la date
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      },
    });

    // Suppression du mot de passe pour la réponse sécurisée
    const { password: _, ...userResponse } = updatedUser as any;

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès",
      user: userResponse
    });

  } catch (error: any) {
    console.error("UPDATE_PROFILE_ERROR_FULL:", error);

    // Gestion des erreurs connues de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Erreur de contrainte d'unicité (doublon)
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        return NextResponse.json(
          { error: `Cette valeur est déjà utilisée : ${target.join(", ")}` },
          { status: 400 }
        );
      }
      // P2025: Record introuvable
      if (error.code === 'P2025') {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour", details: error.message },
      { status: 500 }
    );
  }
}
