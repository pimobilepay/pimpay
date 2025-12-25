import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    // 1. Vérification basique du header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Session manquante" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // 2. Vérification si le token n'est pas "undefined" ou vide
    if (!token || token === "undefined" || token === "null") {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    
    // 3. Tentative de vérification du JWT
    let payload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (jwtError) {
      console.error("JWT_VERIFY_ERROR:", jwtError);
      return NextResponse.json({ error: "Session expirée ou corrompue" }, { status: 401 });
    }

    const userId = (payload.userId || payload.sub) as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: { where: { currency: "PI" }, take: 1 },
        transactionsFrom: { take: 10, orderBy: { createdAt: 'desc' }, include: { toUser: true } },
        transactionsTo: { take: 10, orderBy: { createdAt: 'desc' }, include: { fromUser: true } }
      }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const piBalance = user.wallets?.[0]?.balance ?? 0;

    return NextResponse.json({
      profile: {
        fullName: user.name || user.firstName || "Pioneer",
        kycStatus: user.kycStatus,
        avatar: user.avatar
      },
      stats: {
        piBalance: piBalance,
        globalValueUSD: piBalance * 314159,
      },
      timeline: [] // Tu peux remplir ici plus tard
    });

  } catch (error: any) {
    console.error("ERREUR_PROFILE_DETAIL:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
