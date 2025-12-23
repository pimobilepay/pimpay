import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * adminAuth - Vérifie si l'utilisateur est un administrateur
 * Supporte le header Authorization Bearer et les Cookies
 */
export function adminAuth(req: NextRequest) {
  try {
    // 1. Récupération du token (Header ou Cookie)
    let token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      token = req.cookies.get("token")?.value;
    }

    // 2. Si aucun token n'est trouvé
    if (!token) {
      console.error("Auth Error: No token found");
      return null;
    }

    // 3. Vérification du JWT
    const payload = jwt.verify(token, JWT_SECRET) as any;

    // 4. Vérification du rôle
    if (payload.role !== "ADMIN") {
      console.error("Auth Error: User is not ADMIN", payload.role);
      return null;
    }

    // 5. Tout est bon, on retourne les données de l'admin
    return payload;

  } catch (err) {
    console.error("Auth Error: JWT verification failed", err);
    return null;
  }
}
