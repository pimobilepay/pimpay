import { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Interface pour sécuriser le typage du Token
 */
interface TokenPayload {
  id: string;
  role: string;
  email?: string;
  name?: string;
}

/**
 * verifyAuth - Vérifie si le token est valide (Version compatible Edge/Node)
 */
export async function verifyAuth(req: NextRequest): Promise<TokenPayload | null> {
  try {
    // 1. Récupération du token (Cookie en priorité pour Next.js, puis Header)
    let token = req.cookies.get("token")?.value;

    if (!token) {
      token = req.headers.get("authorization")?.split(" ")[1];
    }

    if (!token || !JWT_SECRET) {
      return null;
    }

    // 2. Vérification du JWT avec 'jose' (plus robuste sur Next.js 14/15)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    return payload as unknown as TokenPayload;

  } catch (err) {
    // Évite de loguer les erreurs d'expiration normales pour ne pas polluer les logs
    return null;
  }
}

/**
 * adminAuth - Vérifie spécifiquement le rôle ADMIN
 * Note : Puisque verifyAuth est async, adminAuth doit l'être aussi
 */
export async function adminAuth(req: NextRequest): Promise<TokenPayload | null> {
  const payload = await verifyAuth(req);

  if (!payload || payload.role !== "ADMIN") {
    return null;
  }

  return payload;
}
