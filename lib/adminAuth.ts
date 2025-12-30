import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

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

    if (!token || !JWT_SECRET) {
      return null;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // On force le typage pour correspondre à ton interface
    return {
      id: payload.id as string,
      role: payload.role as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
    };

  } catch (err) {
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
