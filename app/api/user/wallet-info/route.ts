export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // On récupère l'user, son premier wallet PI, et ses transactions
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        wallets: { where: { currency: "PI" }, take: 1 },
        transactionsFrom: { orderBy: { createdAt: 'desc' }, take: 5 },
        transactionsTo: { orderBy: { createdAt: 'desc' }, take: 5 },
        virtualCards: { take: 1 } // Pour récupérer le numéro de carte
      }
    });

    if (!dbUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Fusionner les transactions envoyées et reçues
    const allTx = [
      ...dbUser.transactionsFrom.map(t => ({ ...t, displayType: 'send' })),
      ...dbUser.transactionsTo.map(t => ({ ...t, displayType: 'receive' }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

    // Extraction des données
    const wallet = dbUser.wallets[0];
    const card = dbUser.virtualCards[0];

    return NextResponse.json({
      userData: {
        name: dbUser.username || dbUser.firstName || "Pi User",
        balance: wallet?.balance || 0,
        cardNumber: card?.number || "•••• •••• •••• 4412",
        expiry: card?.exp || "12/26",
        kycStatus: dbUser.kycStatus // Retourne "VERIFIED", "PENDING", etc.
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
        date: new Date(t.createdAt).toLocaleDateString('fr-FR'),
        title: t.description || (t.displayType === 'send' ? 'Transfert envoyé' : 'Paiement reçu')
      }))
    });

  } catch (error: any) {
    console.error("API_WALLET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
