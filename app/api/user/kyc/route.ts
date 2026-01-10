export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Authentification (Correction de l'accès à l'ID)
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { 
      fullName, 
      documentType, 
      documentNumber, 
      documentFrontUrl, 
      documentBackUrl, // Optionnel mais présent dans tes besoins habituels
      selfieUrl 
    } = await req.json();

    // 2. Mise à jour de l'utilisateur avec les champs exacts du schéma
    await prisma.user.update({
      where: { id: session.id },
      data: {
        name: fullName,
        idType: documentType,
        idNumber: documentNumber,
        kycFrontUrl: documentFrontUrl,
        kycBackUrl: documentBackUrl || null,
        kycSelfieUrl: selfieUrl,
        kycStatus: "PENDING", // Utilise l'Enum KycStatus (ligne 596)
        kycSubmittedAt: new Date()
      }
    });

    // 3. Création de la notification (Respect du modèle Notification ligne 535)
    await prisma.notification.create({
      data: {
        userId: session.id,
        title: "KYC en cours d'examen",
        message: "Vos documents ont été reçus. Vérification sous 24h.",
        type: "info" // 'info' est la valeur par défaut dans ton schéma (ligne 542)
      }
    });

    return NextResponse.json({ success: true, status: "PENDING" });

  } catch (error: any) {
    console.error("KYC_ROUTE_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la soumission du dossier" },
      { status: 500 }
    );
  }
}
