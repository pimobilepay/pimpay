import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];

    // Pour le moment, on récupère le premier utilisateur actif pour le test
    // À remplacer plus tard par la validation réelle du token Pi Network
    const user = await prisma.user.findFirst({
      where: {
        status: "ACTIVE"
      },
      select: { id: true, username: true }
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username || "pi_user"
    };
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}
