export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    // 1. TENTATIVE DE RÉCUPÉRATION DU PAYLOAD VIA LE HELPER
    let payload = null;
    try {
      payload = verifyAuth(req);
    } catch (e) {
      console.error("AUTH_HELPER_FAILED:", e);
    }

    // 2. LOGIQUE DE SECOURS RENFORCÉE
    if (!payload || !payload.id) {
      // On récupère le token brut
      const rawToken = req.cookies.get('token')?.value || 
                       req.headers.get('authorization')?.split(' ')[1];

      if (rawToken) {
        // Nettoyage au cas où le token soit préfixé par "Bearer " par erreur dans le cookie
        const cleanToken = rawToken.replace('Bearer ', '');

        // Recherche dans la table Session de ton schéma Prisma
        const dbSession = await prisma.session.findFirst({
          where: { 
            token: cleanToken,
            isActive: true 
          },
          select: { userId: true }
        });

        if (dbSession) {
          payload = { id: dbSession.userId };
          console.log("AUTH_SUCCESS: Session validée manuellement via DB");
        }
      }
    }

    // 3. VÉRIFICATION FINALE (Si toujours pas de payload -> 401)
    if (!payload || !payload.id) {
      return NextResponse.json(
        { 
          error: "Session expirée ou non autorisée",
          message: "Veuillez vous reconnecter pour rafraîchir votre accès." 
        },
        { status: 401 }
      );
    }

    // 4. RÉCUPÉRATION DES DONNÉES UTILISATEUR
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        wallets: {
          where: { currency: "PI" },
          take: 1
        },
        transactionsFrom: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        transactionsTo: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        virtualCards: {
          take: 1
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 5. FORMATAGE DES TRANSACTIONS (FUSION ET TRI)
    const sentTx = dbUser.transactionsFrom || [];
    const receivedTx = dbUser.transactionsTo || [];

    const allTx = [
      ...sentTx.map(t => ({ ...t, displayType: 'send' })),
      ...receivedTx.map(t => ({ ...t, displayType: 'receive' }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

    const wallet = dbUser.wallets?.[0];
    const card = dbUser.virtualCards?.[0];

    // 6. RÉPONSE FINALE STRUCTURÉE POUR LE FRONTEND
    return NextResponse.json({
      userData: {
        name: dbUser.username || dbUser.firstName || dbUser.name || "Pi User",
        balance: wallet?.balance ?? 0,
        cardNumber: card?.number || "•••• •••• •••• 4412",
        expiry: card?.exp || "12/26",
        kycStatus: dbUser.kycStatus || "NONE"
      },
      cashFlow: [
        { name: 'Lun', amount: 400 }, { name: 'Mar', amount: 300 },
        { name: 'Mer', amount: 900 }, { name: 'Jeu', amount: 500 },
        { name: 'Ven', amount: 1200 }, { name: 'Sam', amount: 600 },
        { name: 'Dim', amount: 800 },
      ],
      recentTransactions: allTx.map(t => ({
        id: t.id,
        type: t.displayType,
        amount: t.amount,
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '---',
        title: t.description || (t.displayType === 'send' ? 'Transfert envoyé' : 'Paiement reçu'),
        status: t.status || "COMPLETED"
      }))
    });

  } catch (error: any) {
    console.error("CRITICAL_WALLET_API_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }
}
