export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query manquante" }, { status: 400 });
  }

  try {
    // 1. Recherche interne selon ton Schéma Prisma
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: query, mode: 'insensitive' } },
          { username: { equals: query, mode: 'insensitive' } },
          { phone: query },
          { sidraAddress: query }, // Pour SDA
          { usdtAddress: query },  // Pour USDT
          { walletAddress: query } // Pour Pi / BTC
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        kycStatus: true,
        sidraAddress: true,
        usdtAddress: true,
        walletAddress: true
      }
    });

    if (user) {
      return NextResponse.json({
        ...user,
        isExternal: false
      });
    }

    // 2. Détection d'adresse externe (si non trouvé en interne)
    const isSdaOrEth = /^0x[a-fA-F0-9]{40}$/.test(query);
    const isTron = query.startsWith('T') && query.length === 34; // Format USDT TRC20

    if (isSdaOrEth || isTron) {
      return NextResponse.json({
        id: "external",
        username: query.slice(0, 6) + "..." + query.slice(-4),
        firstName: "Destinataire",
        lastName: isSdaOrEth ? "SDA Externe" : "USDT Externe",
        // Génération d'un avatar pro via DiceBear pour les adresses externes
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${query}`,
        isExternal: true,
        // On remplit le bon champ pour l'API de transfert
        sidraAddress: isSdaOrEth ? query : null,
        usdtAddress: isTron ? query : null,
        kycStatus: "EXTERNAL"
      });
    }

    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  } catch (error) {
    console.error("Erreur Search API Pimpay:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
