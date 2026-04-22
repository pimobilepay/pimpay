export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query manquante" }, { status: 400 });
  }

  try {
    // AUTHENTICATION via lib/auth.ts
    const authUser = await auth();
    if (!authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- 1. RECHERCHE INTERNE (PimPay Database) ---
    let foundUser = null;
    
    // Support pour le format PIMPAY-XXXXXX (code marchand de mpay)
    if (query.toUpperCase().startsWith("PIMPAY-")) {
      const userIdPart = query.replace(/PIMPAY-/i, "").toLowerCase();
      foundUser = await prisma.user.findFirst({
        where: {
          id: { startsWith: userIdPart }
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
    }
    
    // Si pas trouve par PIMPAY, rechercher par autres identifiants
    if (!foundUser) {
      foundUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: query, mode: 'insensitive' } },
            { username: { equals: query, mode: 'insensitive' } },
            { phone: query },
            { sidraAddress: query },
            { usdtAddress: query },
            { walletAddress: query },
            { id: query } // Recherche directe par ID
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
    }

    if (foundUser) {
      return NextResponse.json({
        ...foundUser,
        isExternal: false
      });
    }

    // --- 2. DETECTION D'ADRESSE EXTERNE (tous reseaux) ---
    const isPiAddress = /^G[A-Z2-7]{55}$/.test(query);
    const isSdaOrEth = /^0x[a-fA-F0-9]{40}$/.test(query);
    const isTron = /^T[a-zA-Z0-9]{33}$/.test(query);
    const isXrp = /^r[a-zA-Z0-9]{24,33}$/.test(query);
    const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query) && !isSdaOrEth && !isTron && !isPiAddress && !isXrp;
    const isBtcLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(query);
    const isBtcBech32 = /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(query);
    const isLtc = /^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(query);

    const isExternal = isPiAddress || isSdaOrEth || isTron || isXrp || isSolana || isBtcLegacy || isBtcBech32 || isLtc;

    if (isExternal) {
      let lastName = "Externe";
      if (isPiAddress) lastName = "Pi Network";
      else if (isSdaOrEth) lastName = "SDA/EVM";
      else if (isTron) lastName = "USDT TRC20 (TRON)";
      else if (isXrp) lastName = "XRP Ledger";
      else if (isSolana) lastName = "Solana";
      else if (isBtcLegacy || isBtcBech32) lastName = "Bitcoin";
      else if (isLtc) lastName = "Litecoin";

      return NextResponse.json({
        id: "external",
        username: query.slice(0, 6) + "..." + query.slice(-4),
        firstName: "Adresse Externe",
        lastName,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${query}`,
        isExternal: true,
        walletAddress: isPiAddress ? query : null,
        sidraAddress: isSdaOrEth ? query : null,
        usdtAddress: isTron ? query : null,
        kycStatus: "EXTERNAL"
      });
    }

    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  } catch (error: any) {
    console.error("SEARCH_API_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
