export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // 1. Extraction du token
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get("token")?.value;
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
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const userId = (payload.id || payload.userId || payload.sub) as string;

    // 3. Récupération complète des données (incluant TOUS les wallets et la carte)
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
        createdAt: true,
        // CORRECTION : On récupère TOUS les wallets pour avoir les soldes Fiat (USD, XAF, etc.)
        wallets: {
          select: { 
            id: true, 
            balance: true, 
            currency: true 
          }
        },
        // AJOUT : Récupération de la carte virtuelle réelle
        virtualCards: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            exp: true,
            cvv: true,
            holder: true,
            brand: true,
            type: true
          }
        },
        transactionsFrom: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            createdAt: true,
            reference: true
          }
        },
        transactionsTo: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            createdAt: true,
            reference: true
          }
        },
        _count: {
          select: {
            transactionsFrom: true,
            transactionsTo: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 4. Préparation des transactions fusionnées
    const mergedTransactions = [
      ...user.transactionsFrom.map(tx => ({ ...tx, flow: 'OUT' })),
      ...user.transactionsTo.map(tx => ({ ...tx, flow: 'IN' }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

    // Récupération du solde principal (PI) pour compatibilité
    const piWallet = user.wallets.find(w => w.currency === "PI");
    const piBalance = piWallet?.balance ?? 0;

    // 5. Réponse structurée pour PimPay
    return NextResponse.json({
      success: true,
      // Infos utilisateur
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name || user.username || "Pioneer",
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      joinedAt: user.createdAt,
      avatar: user.avatar,
      
      // Données financières
      balance: piBalance, // Solde PI par défaut
      currency: "PI",
      wallets: user.wallets, // Liste complète des soldes Fiat (utilisée par ta page CardPage)
      virtualCards: user.virtualCards, // Données réelles de la carte
      transactions: mergedTransactions,
      
      stats: {
        totalTransactions: user._count.transactionsFrom + user._count.transactionsTo,
      }
    });

  } catch (error: any) {
    console.error("ERREUR_CRITIQUE_PROFILE:", error.message);
    return NextResponse.json({ error: "Erreur interne", details: error.message }, { status: 500 });
  }
}
