import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as jose from "jose" // Importation nécessaire pour lire le token

// Fonction interne pour valider le secret
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
};

export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    // On regarde aussi les cookies car ton middleware fonctionne avec eux
    const cookieToken = req.cookies.get('token')?.value

    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (!token) return null;

    // --- LE SEUL CHANGEMENT ESSENTIEL ---
    // On décode le token pour avoir l'ID de l'utilisateur réel
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;
    // ------------------------------------

    const user = await prisma.user.findUnique({ // findUnique au lieu de findFirst pour la précision
      where: {
        id: userId, // On cherche l'utilisateur du token !
        status: "ACTIVE"
      },
      select: {
        id: true,
        username: true,
        role: true 
      }
    })

    if (!user) return null

    return {
      id: user.id,
      username: user.username || "pi_user",
      role: user.role
    }
  } catch (error) {
    // Si le token est invalide, on ne plante pas, on renvoie null
    return null
  }
}

export const auth = async () => {
  // Cette fonction reste simple pour tes actions card-purchase etc.
  // Elle renvoie le profil type si besoin de validation de base
  return await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, username: true, role: true }
  });
}
