import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Récupération de l'utilisateur (Simulation de session via findFirst)
    const user = await prisma.user.findFirst({
      include: {
        wallets: true, // Récupère tous les portefeuilles (USD, PI, XAF, etc.)
        virtualCards: true,
        transactionsFrom: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 2. Organisation des soldes par devise pour un accès facile côté Front
    const balances = user.wallets.reduce((acc: any, wallet) => {
      acc[wallet.currency] = {
        balance: wallet.balance,
        type: wallet.type,
        updatedAt: wallet.updatedAt
      };
      return acc;
    }, {});

    // 3. Retourner une structure de données propre
    return NextResponse.json({
      profile: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        kycStatus: user.kycStatus,
        avatar: user.avatar
      },
      balances, // Ex: { USD: {...}, PI: {...}, XAF: {...} }
      virtualCard: user.virtualCards[0] || null,
      recentTransactions: user.transactionsFrom
    });

  } catch (error) {
    console.error("API Wallet Error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des données" }, { status: 500 });
  }
}
