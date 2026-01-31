import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Selon ton schéma, on cherche dans la table User
    const pendingUsers = await prisma.user.findMany({
      where: {
        kycStatus: "PENDING", // KycStatus enum
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        address: true,
        birthDate: true,
        gender: true,
        // Champs KYC spécifiques de ton schéma
        idType: true,
        idNumber: true,
        idExpiryDate: true,
        kycFrontUrl: true,
        kycBackUrl: true,
        kycSelfieUrl: true,
        kycSubmittedAt: true,
      },
      orderBy: {
        kycSubmittedAt: "desc",
      },
    });

    return NextResponse.json(pendingUsers);
  } catch (error) {
    console.error("[ADMIN_KYC_PENDING]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
