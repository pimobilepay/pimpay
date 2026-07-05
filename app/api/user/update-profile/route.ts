export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // [FIX V16] Auth centralisée et vérifiée cryptographiquement.
    const userId = await getAuthUserId();

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();

    // --- LOGIQUE DE NETTOYAGE DES DONNEES ---
    const updateData: any = {
      firstName: body.firstName ?? undefined,
      lastName: body.lastName ?? undefined,
      username: body.username ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      country: body.country ?? undefined,
      city: body.city ?? undefined,
      address: body.address ?? undefined,
      postalCode: body.postalCode ?? undefined,
      nationality: body.nationality ?? undefined,
      gender: body.gender ?? undefined,
      occupation: body.occupation ?? undefined,
      sourceOfFunds: body.sourceOfFunds ?? undefined,
      idType: body.idType ?? undefined,
      idNumber: body.idNumber ?? undefined,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      // On n'accepte l'adresse que si elle ressemble a une vraie adresse Pi (commence par G)
      walletAddress: body.walletAddress?.startsWith('G') ? body.walletAddress.trim() : undefined,
      sidraAddress: body.sidraAddress ?? undefined,
      usdtAddress: body.usdtAddress ?? undefined,
    };

    // Mise à jour dans la base de données
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour",
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        sidraAddress: updatedUser.sidraAddress
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
