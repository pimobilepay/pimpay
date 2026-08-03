import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantReferrerBonusIfEligible } from "@/app/api/referral/route";
import { adminAuth } from "@/lib/adminAuth";
import { sendNotification } from "@/lib/notifications";
import { getOrCreateKycTicket, buildUserDisplayName } from "@/lib/kyc-ticket";

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
    // avec le ticket cree lors de la soumission, son nom et son avatar
    const kycTicket = await getOrCreateKycTicket(userId);
    const displayName = buildUserDisplayName(updatedUser);
    const decidedAt = new Date().toISOString();

    if (status === "APPROVED") {
      await sendNotification({
        userId,
        title: "Verification d'identite approuvee",
        message: `Bonjour ${displayName}, votre piece d'identite a ete approuvee. Vous pouvez poursuivre normalement votre parcours de creation de carte.`,
        type: "KYC_APPROVED",
        metadata: {
          status: "APPROVED",
          ticket: kycTicket,
          reference: kycTicket,
          decidedAt,
          userName: displayName,
          userAvatar: updatedUser.avatar || undefined,
          kycLevel: "VERIFIE",
        },
      });
    } else {
      await sendNotification({
        userId,
        title: "Verification d'identite refusee",
        message: reason
          ? `Bonjour ${displayName}, votre verification d'identite a ete refusee. Motif : ${reason}. Veuillez soumettre a nouveau votre dossier.`
          : `Bonjour ${displayName}, votre verification d'identite a ete refusee. Veuillez soumettre a nouveau votre dossier.`,
        type: "KYC_REJECTED",
        metadata: {
          status: "REJECTED",
          reason: reason || undefined,
          ticket: kycTicket,
          reference: kycTicket,
          decidedAt,
          userName: displayName,
          userAvatar: updatedUser.avatar || undefined,
        },
      });
    }

    // Journal d'audit admin (table auditLog affichée dans Admin > Journal d'audit)
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminPayload.id },
        select: { id: true, name: true, email: true },
      });
      await prisma.auditLog.create({
        data: {
          adminId: adminPayload.id,
          adminName: admin?.name || admin?.email || adminPayload.email || "Admin",
          action: status === "APPROVED" ? "APPROVE_KYC" : "REJECT_KYC",
          targetId: updatedUser.id,
          targetEmail: updatedUser.email || null,
          details:
            status === "APPROVED"
              ? `Approbation du KYC de ${updatedUser.email || updatedUser.username || updatedUser.id}`
              : `Rejet du KYC de ${updatedUser.email || updatedUser.username || updatedUser.id}${reason ? ` (Motif : ${reason})` : ""}`,
        },
      });
    } catch (auditErr) {
      console.error("Audit Log Ignored (KYC verify):", auditErr);
    }

    return NextResponse.json({ message: "Statut mis à jour", user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_KYC_VERIFY]", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
