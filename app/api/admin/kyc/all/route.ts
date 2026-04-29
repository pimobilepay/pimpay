import { requireAdmin } from "@/lib/requireAdmin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/kyc/all
 * Retourne tous les utilisateurs avec leur statut KYC (pending, verified, rejected)
 * Exclu les utilisateurs avec kycStatus = NONE (jamais soumis)
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Récupérer les utilisateurs qui ont soumis un KYC (exclu NONE)
    const users = await prisma.user.findMany({
      where: {
        kycStatus: {
          not: "NONE",
        },
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
        nationality: true,
        occupation: true,
        // Champs KYC spécifiques
        idType: true,
        idNumber: true,
        idCountry: true,
        idDeliveryDate: true,
        idExpiryDate: true,
        kycFrontUrl: true,
        kycBackUrl: true,
        kycSelfieUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycReason: true,
        kycStatus: true,
        // Informations additionnelles
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: [
        { kycStatus: "asc" }, // PENDING en premier
        { kycSubmittedAt: "desc" },
      ],
    });

    // Séparer les utilisateurs par statut
    const pending = users.filter((u) => u.kycStatus === "PENDING");
    const verified = users.filter((u) => u.kycStatus === "VERIFIED" || u.kycStatus === "APPROVED");
    const rejected = users.filter((u) => u.kycStatus === "REJECTED");

    return NextResponse.json({
      pending,
      verified,
      rejected,
      stats: {
        total: users.length,
        pendingCount: pending.length,
        verifiedCount: verified.length,
        rejectedCount: rejected.length,
      },
    });
  } catch (error) {
    console.error("[ADMIN_KYC_ALL]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
