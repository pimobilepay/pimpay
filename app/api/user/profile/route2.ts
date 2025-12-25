import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // 1. Extraction hybride du token (Cookies OU Authorization Header)
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get("token")?.value;
    
    // On récupère le header et on vérifie s'il n'est pas "undefined" ou "null" en string
    const authHeader = request.headers.get("authorization");
    const tokenHeader = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    const token = tokenCookie || (tokenHeader !== "undefined" && tokenHeader !== "null" ? tokenHeader : null);

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
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // 3. Récupération des données avec Prisma
    const userId = (payload.id || payload.userId || payload.sub) as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        // On récupère le solde depuis la relation wallets
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

    // 4. Calcul du solde (Fallback à 0 si pas de wallet)
    const wallet = user.wallets?.[0];
    const balance = wallet?.balance ?? 0;

    // 5. Réponse structurée (Compatible avec ton frontend actuel)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.username || "Pioneer",
        role: user.role,
        status: user.status,
        kycStatus: user.kycStatus,
        walletAddress: user.walletAddress,
        avatar: user.avatar,
      },
      // Ces champs restent à la racine pour ne pas casser tes affichages actuels
      balance: balance,
      currency: wallet?.currency || "XAF",
      gcvValue: balance * 314159,
      // On renvoie aussi le nom à la racine si ton dashboard l'attend là
      name: user.name || user.username || "Pioneer"
    });

  } catch (error: any) {
    console.error("ERREUR_CRITIQUE_PROFILE:", error.message);
    return NextResponse.json({
      error: "Erreur interne",
      details: error.message
    }, { status: 500 });
  }
}
