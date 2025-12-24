import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * verifyAuth - Vérifie simplement si le token est valide (pour USER et ADMIN)
 */
export function verifyAuth(req: NextRequest) {
  try {
    // 1. Récupération du token (Header ou Cookie)
    let token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      token = req.cookies.get("token")?.value;
    }

    if (!token) return null;

    // 2. Vérification du JWT
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload;

  } catch (err) {
    return null;
  }
}

/**
 * adminAuth - Vérifie si l'utilisateur est spécifiquement un ADMIN
 */
export function adminAuth(req: NextRequest) {
  const payload = verifyAuth(req);

  if (!payload || payload.role !== "ADMIN") {
    console.error("Auth Error: Access Denied. Role:", payload?.role);
    return null;
  }

  return payload;
}
