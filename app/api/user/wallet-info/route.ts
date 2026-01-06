export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 1. EXTRACTION DU TOKEN PLUS ROBUSTE
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value;
    
    let cleanToken = "";
    if (cookieToken) {
      cleanToken = cookieToken;
    } else if (authHeader?.startsWith('Bearer ')) {
      cleanToken = authHeader.substring(7);
    }

    if (!cleanToken) {
      return NextResponse.json(
        { error: "Authentification requise", message: "Token manquant" },
        { status: 401 }
      );
    }

    // 2. VALIDATION DE LA SESSION (On ajoute un timeout conceptuel via Prisma)
    const dbSession = await prisma.session.findFirst({
      where: {
        token: cleanToken,
        isActive: true
      },
      select: { userId: true }
    });

    if (!dbSession) {
      return NextResponse.json(
        { error: "Session invalide", message: "Veuillez vous reconnecter" },
        { status: 401 }
      );
    }

    // 3. RÉCUPÉRATION OPTIMISÉE (On ne récupère que le nécessaire pour le Swap si besoin)
    const dbUser = await prisma.user.findUnique({
      where: { id: dbSession.userId },
      include: {
        wallets: { where: { currency: "PI" }, take: 1 },
        virtualCards: { take: 1 },
        // On limite les transactions pour accélérer la réponse
        transactionsFrom: { orderBy: { createdAt: 'desc' }, take: 5 },
        transactionsTo: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const piWallet = dbUser.wallets[0];
    const activeCard = dbUser.virtualCards[0];

    // 4. RÉPONSE UNIFIÉE
    return NextResponse.json({
      success: true,
      userData: {
        id: dbUser.id,
        name: dbUser.username || "Pi User",
        balance: piWallet?.balance ?? 0,
        cardNumber: activeCard?.number || "•••• •••• •••• 4412",
        expiry: activeCard?.exp || "12/26",
        kycStatus: dbUser.kycStatus
      }
    });

  } catch (error: any) {
    console.error("CRITICAL_WALLET_API_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur technique", details: error.message },
      { status: 500 }
    );
  }
}
