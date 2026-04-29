import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantReferrerBonusIfEligible } from "@/app/api/referral/route";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { userId, status, reason } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Traduction du statut pour l'enum KycStatus de ton Prisma
    // status reçu: "APPROVED" ou "REJECTED"
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: status === "APPROVED" ? "VERIFIED" : "REJECTED",
        kycVerifiedAt: status === "APPROVED" ? new Date() : null,
        kycReason: status === "REJECTED" ? reason : null,
      },
    });

    // Si KYC approuve, verifier et accorder le bonus de parrainage si eligible
    if (status === "APPROVED") {
      await grantReferrerBonusIfEligible(userId);
    }

    return NextResponse.json({ message: "Statut mis à jour", user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_KYC_VERIFY]", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
