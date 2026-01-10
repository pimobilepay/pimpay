export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/user/balance
 * Récupère le solde de l'utilisateur authentifié depuis le Wallet Pimpay
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Vérification de la session
    const authUser = await verifyAuth(req) as any;

    // CORRECTION : On vérifie .id (structure standard Pimpay)
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    // 2. Récupération du Wallet PI (Schéma : un User a plusieurs Wallets)
    // On utilise l'identifiant unique composé [userId, currency]
    const wallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: authUser.id,
          currency: "PI"
        }
      }
    });

    // 3. Cas où le wallet n'existe pas encore
    if (!wallet) {
      return NextResponse.json({
        balance: 0,
        frozenBalance: 0,
        currency: "PI",
        message: "Portefeuille non initialisé"
      });
    }

    // 4. Réponse avec les données du schéma Wallet
    return NextResponse.json({
      balance: wallet.balance,
      frozenBalance: wallet.frozenBalance,
      currency: wallet.currency,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Critical API Balance Error:", error.message);
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
