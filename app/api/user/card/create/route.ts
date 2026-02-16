export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

// Fonction utilitaire pour générer un numéro de carte
const generateCardNumber = () => {
  let num = "5412"; // Préfixe Mastercard
  for (let i = 0; i < 12; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    // 1. Vérifier si l'utilisateur a déjà une carte
    const existingCard = await prisma.virtualCard.findFirst({
      where: { userId }
    });

    if (existingCard) {
      return NextResponse.json({ error: "Vous possédez déjà une carte" }, { status: 400 });
    }

    // 2. Récupérer les infos utilisateur pour le nom sur la carte
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 3. CRÉATION DE LA CARTE DANS LA BDD (Respect du schéma Pimpay)
    const newCard = await prisma.virtualCard.create({
      data: {
        userId: userId,
        number: generateCardNumber(),
        exp: "12/28",
        cvv: Math.floor(100 + Math.random() * 900).toString(),
        holder: (user?.name || user?.username || "PIMPAY USER").toUpperCase(),
        brand: "MASTERCARD",
        // CORRECTION : On utilise isFrozen (false = Active) au lieu de status
        isFrozen: false, 
        type: "CLASSIC", // Valeur de l'enum CardType
        dailyLimit: 1000,
        allowedCurrencies: ["USD", "PI"]
      }
    });

    return NextResponse.json({ success: true, card: newCard });

  } catch (error: any) {
    console.error("ERREUR_CREATION_CARTE:", error.message);
    return NextResponse.json({ error: "Erreur lors de la création de la carte" }, { status: 500 });
  }
}
