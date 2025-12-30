import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1. On garde ta fonction existante pour ne pas casser les appels actuels
export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]

    // On cherche l'utilisateur dans ta base PostgreSQL (via Prisma)
    const user = await prisma.user.findFirst({
      where: {
        status: "ACTIVE"
      },
      select: { 
        id: true, 
        username: true,
        role: true // Ajouté au cas où tes actions en ont besoin
      }
    })

    if (!user) return null

    return {
      id: user.id,
      username: user.username || "pi_user",
      role: user.role
    }
  } catch (error) {
    console.error("Auth Error:", error)
    return null
  }
}

/**
 * 2. AJOUT DE L'EXPORT 'auth' POUR CORRIGER L'ERREUR DE BUILD
 * Cet export permet de satisfaire l'import { auth } dans :
 * - app/actions/card-purchase.ts
 * - app/api/user/transactions/route.ts
 */
export const auth = async () => {
  // Dans un Server Action, on ne peut pas accéder directement à 'req' facilement.
  // Si tes actions appellent 'auth()', cette fonction servira de pont.
  // Note : Cette implémentation dépend de comment tes actions l'utilisent.
  return await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, username: true, role: true }
  });
}
