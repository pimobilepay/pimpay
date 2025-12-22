export const dynamic = 'force-dynamic'; // Indispensable pour éviter l'erreur de build avec request.headers

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/user/balance
 * Récupère le solde de l'utilisateur authentifié depuis la base de données Pimpay
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Vérification de la session via le token Pi (Bearer Token)
    // verifyAuth va extraire le UID de l'utilisateur depuis les headers
    const user = await verifyAuth(req);

    if (!user || !user.uid) {
      return NextResponse.json(
        { error: "Authentification requise" }, 
        { status: 401 }
      );
    }

    // 2. Récupération des données en base de données via Prisma
    const userData = await prisma.user.findUnique({
      where: { 
        piId: user.uid 
      },
      select: {
        balance: true,
        username: true,
        // On ne sélectionne que ce qui est nécessaire pour la performance
      }
    });

    // 3. Cas où l'utilisateur n'existe pas encore dans notre DB locale
    if (!userData) {
      return NextResponse.json({ 
        balance: 0, 
        currency: "Pi",
        message: "Compte non encore initialisé en base" 
      });
    }

    // 4. Réponse avec le solde réel
    return NextResponse.json({
      balance: userData.balance,
      username: userData.username,
      currency: "Pi",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Logging de l'erreur pour le débogage serveur
    console.error("Critical API Balance Error:", error);
    
    return NextResponse.json(
      { error: "Une erreur interne est survenue" }, 
      { status: 500 }
    );
  }
}
