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
 *
 * #6 FIX: Le cookie pi_session_token est INTENTIONNELLEMENT exclu ici.
 * Raison : ce token n'est pas signé cryptographiquement par PimPay.
 * Un attaquant connaissant un userId valide (exposé dans les réponses API)
 * peut forger ce cookie et s'authentifier comme n'importe quel utilisateur.
 *
 * Pour les routes admin, seuls les JWT signés avec JWT_SECRET sont acceptés.
 * Le pi_session_token reste utilisable pour les routes utilisateurs standard
 * (lib/auth.ts → getAuthUserId), mais JAMAIS pour des opérations admin.
 *
 * Correction complète : valider le token via l'API Pi Network (POST /v2/me)
 * avant de l'accepter dans getAuthUserId() — voir commentaire dans lib/auth.ts.
 */
export async function verifyAuth(req: NextRequest): Promise<TokenPayload | null> {
  try {
    // 1. Authorization header (Bearer token)
    let token = req.headers.get("authorization")?.split(" ")[1];

    // 2. Cookies JWT classiques signés
    if (!token) {
      token = req.cookies.get("token")?.value || req.cookies.get("pimpay_token")?.value;
    }

    // NOTE: pi_session_token délibérément ignoré ici.
    // Ce token n'est pas cryptographiquement vérifiable sans appel à l'API Pi Network.
    // Toute authentification admin doit passer par un JWT signé avec JWT_SECRET.

    if (!token) {
      return null;
    }

    // Vérification cryptographique du JWT
    const payload = await verifyJWT(token);
    if (!payload) {
      return null;
    }

    // Récupération des données fraîches depuis la base (role peut avoir changé)
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
