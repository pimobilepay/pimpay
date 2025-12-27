import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const card = await prisma.virtualCard.findFirst({
      where: { userId: payload.id },
      include: {
        user: {
          select: {
            username: true,
            // On récupère aussi le wallet lié à la carte si tu en as un spécifique
            wallets: { where: { currency: "PI" }, take: 1 } 
          }
        }
      }
    });

    if (!card) return NextResponse.json({ error: "Aucune carte trouvée" }, { status: 404 });

    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
