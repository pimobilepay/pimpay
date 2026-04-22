import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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
 * Supporte: Authorization header, cookie "token", cookie "pimpay_token", et cookie "pi_session_token"
 */
export async function verifyAuth(req: NextRequest): Promise<TokenPayload | null> {
  try {
    // 1. Try Authorization header first
    let token = req.headers.get("authorization")?.split(" ")[1];

    // 2. Try classic cookies
    if (!token) {
      token = req.cookies.get("token")?.value || req.cookies.get("pimpay_token")?.value;
    }

    // 3. If still no token, try Pi Network session token (contains userId directly)
    if (!token) {
      const piToken = req.cookies.get("pi_session_token")?.value;
      if (piToken && piToken.length > 20) {
        // Pi token contains the userId directly, fetch user from DB
        const user = await prisma.user.findUnique({
          where: { id: piToken, status: "ACTIVE" },
          select: { id: true, role: true, email: true, name: true }
        });
        
        if (user) {
          return {
            id: user.id,
            role: user.role,
            email: user.email || undefined,
            name: user.name || undefined,
          };
        }
        return null;
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT token using centralized auth
    const payload = await verifyJWT(token);
    if (!payload) {
      return null;
    }

    // Get full user data from DB (including role which may not be in token)
    const user = await prisma.user.findUnique({
      where: { id: payload.id, status: "ACTIVE" },
      select: { id: true, role: true, email: true, name: true }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      role: user.role,
      email: user.email || undefined,
      name: user.name || undefined,
    };

  } catch (err) {
    console.error("[VERIFY_AUTH_ERROR]:", err);
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
