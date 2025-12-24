import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { PI_CONSENSUS_USD } from "@/lib/exchange";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // 1. Vérification du token
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // 2. Récupération ultra-complète (Profil + Wallets + Transactions)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        email: true,
        phone: true,
        kycStatus: true,
        avatar: true,
        // Récupérer tous les portefeuilles
        wallets: {
          select: {
            currency: true,
            balance: true,
          }
        },
        // Récupérer les 10 dernières transactions envoyées
        transactionsFrom: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { toUser: { select: { name: true, firstName: true, avatar: true } } }
        },
        // Récupérer les 10 dernières transactions reçues
        transactionsTo: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { fromUser: { select: { name: true, firstName: true, avatar: true } } }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 3. Calcul de la valeur globale du portefeuille au taux GCV
    const piWallet = user.wallets.find(w => w.currency === "PI");
    const piBalance = piWallet?.balance || 0;
    const globalValueUSD = piBalance * PI_CONSENSUS_USD;

    // 4. Fusion et tri des transactions (Timeline unique)
    const allTransactions = [
      ...user.transactionsFrom.map(tx => ({ ...tx, direction: 'SENT' })),
      ...user.transactionsTo.map(tx => ({ ...tx, direction: 'RECEIVED' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, 15); // On garde les 15 plus récentes

    return NextResponse.json({ 
      user: {
        ...user,
        globalValueUSD,
        piBalance,
        timeline: allTransactions
      } 
    });

  } catch (error) {
    console.error("API_PROFILE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur ou session expirée" }, { status: 500 });
  }
}
