export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 1. EXTRACTION DU TOKEN (Cookie ou Header)
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value;
    const rawToken = cookieToken || authHeader?.split(' ')[1];

    if (!rawToken) {
      return NextResponse.json(
        { error: "Authentification requise", message: "Token manquant" }, 
        { status: 401 }
      );
    }

    const cleanToken = rawToken.replace('Bearer ', '');

    // 2. VALIDATION DE LA SESSION ACTIVE
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

    // 3. RÉCUPÉRATION DES DONNÉES (User + Wallets + Cards + Transactions)
    const dbUser = await prisma.user.findUnique({
      where: { id: dbSession.userId },
      include: {
        wallets: {
          where: { currency: "PI" },
          take: 1
        },
        virtualCards: {
          take: 1
        },
        // Inclus pour assurer la compatibilité avec le Dashboard existant
        transactionsFrom: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        transactionsTo: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 4. FORMATAGE DES TRANSACTIONS (Logique existante préservée)
    const sentTx = dbUser.transactionsFrom || [];
    const receivedTx = dbUser.transactionsTo || [];

    const allTx = [
      ...sentTx.map(t => ({ ...t, displayType: 'send' })),
      ...receivedTx.map(t => ({ ...t, displayType: 'receive' }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

    const piWallet = dbUser.wallets[0];
    const activeCard = dbUser.virtualCards[0];

    // 5. RÉPONSE UNIFIÉE (Compatible avec WalletPage et SummaryPage)
    return NextResponse.json({
      success: true,
      userData: {
        id: dbUser.id,
        name: dbUser.username || dbUser.firstName || dbUser.name || "Pi User",
        balance: piWallet?.balance ?? 0,
        cardNumber: activeCard?.number || "•••• •••• •••• 4412",
        expiry: activeCard?.exp || "12/26",
        kycStatus: dbUser.kycStatus
      },
      // Ces champs permettent à ton Dashboard existant de ne pas "casser"
      recentTransactions: allTx.map(t => ({
        id: t.id,
        type: t.displayType,
        amount: t.amount,
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '---',
        title: t.description || (t.displayType === 'send' ? 'Transfert envoyé' : 'Paiement reçu'),
        status: t.status
      })),
      cashFlow: [
        { name: 'Lun', amount: 400 }, { name: 'Mar', amount: 300 },
        { name: 'Mer', amount: 900 }, { name: 'Jeu', amount: 500 },
        { name: 'Ven', amount: 1200 }, { name: 'Sam', amount: 600 },
        { name: 'Dim', amount: 800 },
      ]
    });

  } catch (error: any) {
    console.error("CRITICAL_WALLET_API_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur technique", details: error.message }, 
      { status: 500 }
    );
  }
}
