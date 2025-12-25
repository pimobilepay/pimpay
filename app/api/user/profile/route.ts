import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // 1. Récupération du token (On vérifie Header ET Cookies pour plus de sécurité)
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      token = cookies().get("token")?.value || null;
    }

    if (!token || token === "undefined" || token === "null") {
      return NextResponse.json({ error: "Session manquante" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

    // 2. Vérification du JWT
    let payload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (jwtError) {
      console.error("JWT_VERIFY_ERROR:", jwtError);
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // IMPORTANT : Utilise 'id' car c'est ce que tu as mis dans ton API Login
    const userId = (payload.id || payload.sub) as string;

    if (!userId) {
      return NextResponse.json({ error: "Format de token invalide" }, { status: 401 });
    }

    // 3. Récupération utilisateur avec gestion d'erreur Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: { 
          // Correction : On enlève le filtre currency si ton wallet n'a que "type"
          // Ou on s'adapte à ton schéma (tu utilisais 'type' dans login)
          take: 1 
        },
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Calcul de la balance (S'adapte si le wallet est vide)
    const piBalance = user.wallets?.[0]?.balance ?? 0;

    // 4. Réponse structurée
    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        fullName: user.name || "Pioneer",
        email: user.email,
        kycStatus: user.kycStatus,
        avatar: user.avatar,
        role: user.role
      },
      stats: {
        piBalance: piBalance,
        globalValueUSD: piBalance * 314159, // Prix GCV
      },
      timeline: [] 
    });

  } catch (error: any) {
    console.error("ERREUR_PROFILE_DETAIL:", error.message);
    // On ne renvoie pas l'erreur brute pour la sécurité
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
