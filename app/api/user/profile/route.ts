import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // 1. Extraction du token depuis les cookies uniquement (plus stable)
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Vérification JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    let payload;
    try {
      const { payload: verified } = await jwtVerify(token, secret);
      payload = verified;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 3. Récupération des données (Lecture seule - pas d'update)
    // On ne sélectionne que des champs dont on est SUR qu'ils existent d'après tes logs
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        status: true,
        kycStatus: true,
        avatar: true,
        walletAddress: true,
        // On récupère le wallet lié
        wallets: {
          take: 1,
          select: {
            balance: true,
            currency: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 4. Préparation de la réponse propre
    const balance = user.wallets[0]?.balance ?? 0;

    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      name: user.name || user.username || "Pioneer",
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      balance: balance,
      walletAddress: user.walletAddress,
      avatar: user.avatar,
      gcvValue: balance * 314159
    });

  } catch (error: any) {
    console.error("ERREUR_CRITIQUE_PROFILE:", error.message);
    return NextResponse.json({ 
      error: "Erreur interne", 
      details: "Vérifiez la structure de la base de données" 
    }, { status: 500 });
  }
}
