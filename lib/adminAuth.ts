import { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

/**
 * Interface pour sécuriser le typage du Token
 */
export interface TokenPayload {
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
    let token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      token = req.cookies.get("token")?.value;
    }

    if (!token) {
      return null;
    }

    const payload = await verifyJWT(token);
    if (!payload) return null;

    return {
      id: payload.id,
      role: payload.role || "USER",
      email: undefined,
      name: payload.username,
    };
  } catch {
    return null;
  }
}

/**
 * adminAuth - Vérifie spécifiquement le rôle ADMIN
 * @returns TokenPayload si valide, null sinon.
 */
export async function adminAuth(req: NextRequest): Promise<TokenPayload | null> {
  const payload = await verifyAuth(req);

  // Vérification stricte du rôle
  if (!payload || payload.role !== "ADMIN") {
    return null;
  }

  return payload;
}
