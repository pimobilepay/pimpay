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

    // 3. Récupération des données avec les bons noms de champs Prisma
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
        wallets: {
          take: 1,
          select: { id: true, balance: true, currency: true }
        },
        // On récupère les deux types de transactions séparément
        transactionsFrom: {
          take: 7,
          orderBy: { createdAt: 'desc' },
          select: { id: true, amount: true, status: true, type: true, description: true, createdAt: true }
        },
        transactionsTo: {
          take: 7,
          orderBy: { createdAt: 'desc' },
          select: { id: true, amount: true, status: true, type: true, description: true, createdAt: true }
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

    // 4. Fusion et tri des transactions (Logique métier)
    // On combine les envois et les réceptions dans un seul tableau
    const mergedTransactions = [
      ...user.transactionsFrom.map(tx => ({ ...tx, flow: 'OUT' })),
      ...user.transactionsTo.map(tx => ({ ...tx, flow: 'IN' }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7); // On garde les 7 plus récentes après fusion

    const wallet = user.wallets?.[0];
    const balance = wallet?.balance ?? 0;

    // 5. Réponse structurée et compatible
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.username || "Pioneer",
        role: user.role,
        status: user.status,
        kycStatus: user.kycStatus,
        joinedAt: user.createdAt,
      },
      balance: balance,
      currency: wallet?.currency || "PI",
      gcvValue: balance * 314159,
      name: user.name || user.username || "Pioneer",
      
      // On renvoie la liste fusionnée ici
      transactions: mergedTransactions, 
      stats: {
        totalTransactions: user._count.transactionsFrom + user._count.transactionsTo,
        walletId: wallet?.id || null
      }
    });

  } catch (error: any) {
    console.error("ERREUR_CRITIQUE_PROFILE:", error.message);
    return NextResponse.json({ error: "Erreur interne", details: error.message }, { status: 500 });
  }
}
