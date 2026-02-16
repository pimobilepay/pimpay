export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query manquante" }, { status: 400 });
  }

  try {
    // --- LE VACCIN : PROTECTION DE L'API ---
    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value;

    let isAuthenticated = false;

    if (piToken) {
      isAuthenticated = true; // L'ID utilisateur Pi est présent
    } else if (classicToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        await jwtVerify(classicToken, secret);
        isAuthenticated = true;
      } catch (e) {
        isAuthenticated = false;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- 1. RECHERCHE INTERNE (PimPay Database) ---
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: query, mode: 'insensitive' } },
          { username: { equals: query, mode: 'insensitive' } },
          { phone: query },
          { sidraAddress: query },
          { usdtAddress: query },
          { walletAddress: query }
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

    // --- 2. DÉTECTION D'ADRESSE EXTERNE ---
    const isSdaOrEth = /^0x[a-fA-F0-9]{40}$/.test(query);
    const isTron = query.startsWith('T') && query.length === 34;
    const isPiAddress = /^G[A-Z2-7]{55}$/.test(query);

    if (isSdaOrEth || isTron || isPiAddress) {
      let lastName = "Externe";
      if (isPiAddress) lastName = "Pi Network Externe";
      else if (isSdaOrEth) lastName = "SDA/EVM Externe";
      else if (isTron) lastName = "USDT Externe";

      return NextResponse.json({
        id: "external",
        username: query.slice(0, 6) + "..." + query.slice(-4),
        firstName: "Destinataire",
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
