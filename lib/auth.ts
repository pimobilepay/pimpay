import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]

    // Validation du token Pi Network (Simulation ou appel réel)
    // IMPORTANT : Pour que Prisma fonctionne, nous devons trouver l'utilisateur
    // dans TA base de données qui correspond à ce token/id Pi.
    
    // Pour le moment, on récupère le premier utilisateur actif pour le test
    // OU on cherche par piUserId si tu l'as déjà stocké.
    const user = await prisma.user.findFirst({
      where: {
        // Idéalement : piUserId: "id_extrait_du_token"
        status: "ACTIVE" 
      },
      select: { id: true, username: true }
    })

    if (!user) return null

    // On retourne l'ID attendu par Prisma (user.id)
    return {
      id: user.id,
      username: user.username || "pi_user"
    }
  } catch (error) {
    console.error("Auth Error:", error)
    return null
  }
}
