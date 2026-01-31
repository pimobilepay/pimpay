import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, KycStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, ...kycData } = data;

    if (!userId) {
      return NextResponse.json({ error: "ID Utilisateur requis" }, { status: 401 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        gender: kycData.gender,
        birthDate: kycData.birthDate ? new Date(kycData.birthDate) : null,
        nationality: kycData.nationality,
        idType: kycData.idType,
        idNumber: kycData.idNumber,
        idExpiryDate: kycData.idExpiryDate ? new Date(kycData.idExpiryDate) : null,
        idCountry: kycData.idCountry,
        phone: kycData.phone,
        address: kycData.address,
        city: kycData.city,
        provinceState: kycData.provinceState,
        kycFrontUrl: kycData.kycFrontUrl,
        kycBackUrl: kycData.kycBackUrl,
        kycSelfieUrl: kycData.kycSelfieUrl,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
      },
    });

    // Sécurité PimPay : Log de l'action
    await prisma.securityLog.create({
      data: {
        userId: userId,
        action: "KYC_SUBMITTED",
        ip: request.headers.get("x-forwarded-for") || "unknown",
      }
    });

    return NextResponse.json({ success: true, status: updatedUser.kycStatus });

  } catch (error: any) {
    console.error("Erreur Submit KYC:", error);
    return NextResponse.json({ error: "Échec de l'enregistrement" }, { status: 500 });
  }
}
