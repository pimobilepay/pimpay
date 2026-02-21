export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    // Récupération sécurisée de l'ID utilisateur
    if (piToken) userId = piToken;
    else if (classicToken) {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(classicToken, secretKey);
      userId = payload.id as string;
    }

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
