import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { fullName, documentType, documentNumber, documentFrontUrl, selfieUrl } = await req.json();

    // On met à jour l'utilisateur et on crée une entrée de notification système
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // Supposons que tu aies ces champs dans ton modèle User ou une table KYC séparée
        kycStatus: "PENDING",
      }
    });

    // Notification à l'utilisateur
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "KYC en cours d'examen",
        message: "Vos documents ont été reçus. Vérification sous 24h.",
        type: "SECURITY"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la soumission" }, { status: 500 });
  }
}
