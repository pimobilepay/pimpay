import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantReferrerBonusIfEligible } from "@/app/api/referral/route";
import { adminAuth } from "@/lib/adminAuth";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const adminPayload = await adminAuth(req);
  if (!adminPayload) return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });

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

    // Notifier l'utilisateur du resultat de la verification KYC
    if (status === "APPROVED") {
      await sendNotification({
        userId,
        title: "KYC approuve !",
        message: "Felicitations ! Votre identite a ete verifiee avec succes. Vous avez maintenant acces a toutes les fonctionnalites de PimPay.",
        type: "SUCCESS",
        metadata: { status: "APPROVED" },
      });
    } else {
      await sendNotification({
        userId,
        title: "KYC refuse",
        message: reason
          ? `Votre verification d'identite a ete refusee. Motif : ${reason}. Veuillez soumettre a nouveau votre dossier.`
          : "Votre verification d'identite a ete refusee. Veuillez soumettre a nouveau votre dossier.",
        type: "warning",
        metadata: { status: "REJECTED", reason: reason || undefined },
      });
    }

    return NextResponse.json({ message: "Statut mis à jour", user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_KYC_VERIFY]", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
