import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // On récupère l'utilisateur avec sa carte virtuelle et son wallet Pi
    const user = await prisma.user.findFirst({
      include: {
        virtualCards: true,
        wallets: { where: { currency: "PI" } }
      }
    });

    if (!user) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

    const card = user.virtualCards[0]; // On prend la première carte

    return NextResponse.json({
      name: card?.holder || user.name || "Pioneer User",
      expiry: card?.exp || "12/28",
      cardNumber: card?.number || "4492 0000 0000 0000",
      kycStatus: user.kycStatus, // Utilise l'Enum KycStatus
      balance: user.wallets[0]?.balance.toFixed(2) || "0.00"
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
