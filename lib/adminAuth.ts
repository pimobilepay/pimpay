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
    // 1. Récupération du token
    // PRIORITÉ au Header Authorization (Bearer) pour éviter les conflits avec de vieux cookies
    let token = req.headers.get("authorization")?.split(" ")[1];

    // Si pas de header, on regarde dans les cookies
    if (!token) {
      token = req.cookies.get("token")?.value;
    }

    if (!token) {
      return null;
    }

    if (!JWT_SECRET) {
      console.error("[PimPay Critical] JWT_SECRET is not defined in .env");
      return null;
    }

    // 2. Vérification du JWT avec 'jose'
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // On s'assure que le payload contient bien l'ID (clé de ton schéma Prisma)
    return payload as unknown as TokenPayload;

  } catch (err) {
    // En cas d'erreur de signature ou expiration, on renvoie null
    return null;
  }
}

/**
 * adminAuth - Vérifie spécifiquement le rôle ADMIN
 */
export async function adminAuth(req: NextRequest): Promise<TokenPayload | null> {
  const payload = await verifyAuth(req);

  if (!payload || payload.role !== "ADMIN") {
    return null;
  }

  return payload;
}
