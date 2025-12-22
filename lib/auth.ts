import { NextRequest } from 'next/server'

export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]

    // Note : Ici, tu devras plus tard appeler l'API Pi Network 
    // pour valider que le 'token' est authentique.
    // Pour le build, on retourne un objet structuré.
    return { 
      uid: "pi_user_id_placeholder",
      username: "pi_user" 
    }
  } catch (error) {
    console.error("Auth Error:", error)
    return null
  }
}
