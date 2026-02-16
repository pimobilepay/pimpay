export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    // 1. Vérifier si l'utilisateur existe et s'il a déjà une carte
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { virtualCards: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (user.virtualCards.length > 0) {
      return NextResponse.json({ error: "Vous possédez déjà une carte active" }, { status: 400 });
    }

    // 2. Générer des données de carte réalistes
    const generateCardNumber = () => {
      let num = "4210"; // Préfixe Visa
      for (let i = 0; i < 12; i++) num += Math.floor(Math.random() * 10);
      return num; // On stocke le numéro brut sans espaces pour la BDD
    };

    const generateCVV = () => Math.floor(100 + Math.random() * 900).toString();

    const now = new Date();
    const expiry = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${(now.getFullYear() + 3).toString().slice(-2)}`;

    // 3. Enregistrer dans la base de données (Respect du schéma Pimpay)
    const newCard = await prisma.virtualCard.create({
      data: {
        userId: user.id,
        number: generateCardNumber(),
        exp: expiry,
        cvv: generateCVV(),
        holder: `${user.firstName || ''} ${user.lastName || ''}`.trim().toUpperCase() || "PIM PIONEER",
        brand: "VISA",
        // CORRECTION : isFrozen au lieu de locked
        isFrozen: false,
        // AJOUT : type est obligatoire selon ton enum CardType
        type: "CLASSIC",
        dailyLimit: 1000,
        allowedCurrencies: ["USD", "PI"]
      }
    });

    return NextResponse.json({ success: true, card: newCard });

  } catch (error: any) {
    console.error("GENERATE_CARD_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de la génération de la carte" }, { status: 500 });
  }
}
