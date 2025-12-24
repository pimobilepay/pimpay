import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Récupération du premier utilisateur (ou l'utilisateur connecté via session)
    const user = await prisma.user.findFirst({
      include: {
        virtualCards: true,
        wallets: { 
          where: { currency: "PI" } 
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 2. Extraction de la carte virtuelle
    const card = user.virtualCards[0];

    // 3. Formatage propre du statut KYC pour le frontend
    const kycLabels: Record<string, string> = {
      "NONE": "NON VÉRIFIÉ",
      "PENDING": "EN ATTENTE",
      "VERIFIED": "VÉRIFIÉ",
      "REJECTED": "REJETÉ"
    };

    // 4. Réponse JSON structurée pour ton composant WalletPage
    return NextResponse.json({
      name: card?.holder || user.name || "JEAN PIONEER",
      expiry: card?.exp || "12/28",
      cardNumber: card?.number || "4492 0000 0000 0000",
      kycStatus: kycLabels[user.kycStatus] || user.kycStatus,
      balance: user.wallets[0]?.balance.toFixed(2) || "0.00"
    });

  } catch (error) {
    console.error("Erreur API WalletInfo:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
