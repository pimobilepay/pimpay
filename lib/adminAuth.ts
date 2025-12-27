import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ton_secret_par_defaut_temporaire";

/**
 * Interface pour sécuriser le typage du Token
 */
interface TokenPayload {
  id: string;
  role: string;
  username?: string;
}

/**
 * verifyAuth - Vérifie si le token est valide (USER ou ADMIN)
 */
export function verifyAuth(req: NextRequest): TokenPayload | null {
  try {
    // 1. Récupération du token (Header Bearer en priorité, puis Cookie)
    let token = req.headers.get("authorization")?.split(" ")[1];
    
    if (!token) {
      token = req.cookies.get("token")?.value;
    }

    if (!token) {
      // console.warn("Auth: Aucun token trouvé dans les headers ou cookies");
      return null;
    }

    // 2. Vérification du JWT
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;

  } catch (err) {
    console.error("JWT Verification Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * adminAuth - Vérifie spécifiquement le rôle ADMIN
 * À utiliser dans /api/admin/config/route.ts
 */
export function adminAuth(req: NextRequest): TokenPayload | null {
  const payload = verifyAuth(req);

  if (!payload) {
    console.error("Admin Auth: Token invalide ou absent");
    return null;
  }

  if (payload.role !== "ADMIN") {
    console.error("Admin Auth: Accès refusé. Rôle actuel:", payload.role);
    return null;
  }

  return payload;
}
