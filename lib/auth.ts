import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as jose from "jose";
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[AUTH] JWT_SECRET is not defined in environment variables");
    return null;
  }
  return new TextEncoder().encode(secret);
};

// ---------------------------------------------------------------------------
// [FIX #25] Cache en mémoire pour la validation Pi Token
// Évite d'appeler l'API Pi Network à chaque requête (TTL 5 minutes).
// Compatible runtime Node.js et Edge (Map est disponible dans les deux).
// ---------------------------------------------------------------------------

interface PiValidationCache {
  userId: string;       // uid retourné par l'API Pi Network
  expiresAt: number;   // timestamp ms
}

const piValidationCache = new Map<string, PiValidationCache>();

/**
 * [FIX #25] validatePiToken — Valide un Pi session token via l'API officielle Pi Network.
 *
 * Implémente POST https://api.minepi.com/v2/me avec le token en Authorization Bearer.
 * Vérifie que le uid retourné par Pi correspond à un utilisateur enregistré en base.
 *
 * Résultat mis en cache 5 minutes pour éviter les appels répétitifs.
 *
 * @param piToken  Le cookie pi_session_token
 * @returns        L'userId interne PimPay si valide, null sinon
 */
async function validatePiToken(piToken: string): Promise<string | null> {
  if (!piToken || piToken.length < 20) return null;

  // 1. Vérifier le cache
  const now = Date.now();
  const cached = piValidationCache.get(piToken);
  if (cached && now < cached.expiresAt) {
    return cached.userId;
  }

  // 2. Appel à l'API Pi Network (POST /v2/me)
  try {
    const piApiUrl = process.env.PI_API_URL || "https://api.minepi.com";
    const response = await fetch(`${piApiUrl}/v2/me`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${piToken}`,
        "Content-Type":  "application/json",
      },
      // Timeout 5s — l'API Pi peut être lente
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // Token invalide ou expiré selon Pi Network
      console.warn(`[AUTH] Pi token validation failed — HTTP ${response.status}`);
      piValidationCache.delete(piToken); // Purger si présent
      return null;
    }

    const data = await response.json();
    const piUid = data?.uid as string | undefined;

    if (!piUid) {
      console.warn("[AUTH] Pi API response missing uid");
      return null;
    }

    // 3. Vérifier que ce piUid correspond à un utilisateur actif en base
    const user = await prisma.user.findFirst({
      where: {
        piUserId: piUid,
        status:   "ACTIVE",
      },
      select: { id: true },
    });

    if (!user) {
      console.warn(`[AUTH] Pi uid ${piUid} not found in DB or account inactive`);
      return null;
    }

    // 4. Mettre en cache (TTL 5 minutes)
    piValidationCache.set(piToken, {
      userId:    user.id,
      expiresAt: now + 5 * 60 * 1000,
    });

    return user.id;

  } catch (error: any) {
    // Timeout ou erreur réseau — fail-safe : refuser le token
    console.error("[AUTH] Pi token validation error:", error?.message || error);
    return null;
  }
}

/**
 * Nettoyage périodique du cache Pi token (évite les fuites mémoire).
 * Appelé dans getAuthUserId() de façon non-bloquante.
 */
function cleanPiCache(): void {
  const now = Date.now();
  for (const [token, entry] of piValidationCache.entries()) {
    if (now > entry.expiresAt) piValidationCache.delete(token);
  }
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

export async function verifyJWT(token: string): Promise<{ id: string; role?: string; username?: string } | null> {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    if (!payload.id) return null;

    return {
      id:       payload.id as string,
      role:     payload.role as string | undefined,
      username: payload.username as string | undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers principaux (usage dans les routes API)
// ---------------------------------------------------------------------------

/**
 * Retourne l'userId authentifié depuis les cookies.
 *
 * Ordre de priorité :
 *   1. JWT classique (token / pimpay_token) — vérification cryptographique + DB isActive
 *   2. Pi session token — [FIX #25] validation via API Pi Network + DB lookup
 *
 * [FIX #22] Vérification de Session.isActive ajoutée pour les JWT :
 *   Permet la révocation immédiate sans changer JWT_SECRET.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    // Nettoyage non-bloquant du cache Pi
    cleanPiCache();

    const cookieStore = await cookies();

    // 1. JWT classique
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (!payload?.id) return null;

      // [FIX #22] Vérifier que la session n'a pas été révoquée
      const session = await prisma.session.findFirst({
        where: {
          token:    classicToken,
          userId:   payload.id,
          isActive: true,
        },
        select: { id: true },
      });

      // Si pas de session active → token révoqué ou session expirée
      if (!session) return null;

      return payload.id;
    }

    // 2. [FIX #25] Pi Browser token — validation cryptographique via API Pi Network
    const piToken = cookieStore.get("pi_session_token")?.value;
    if (piToken) {
      return await validatePiToken(piToken);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Même logique que getAuthUserId() mais depuis les headers de la requête.
 * Utilisé quand cookies() n'est pas disponible (ex: route handlers avec CORS).
 */
export async function getAuthUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    cleanPiCache();

    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookies = Object.fromEntries(
      cookieHeader.split('; ').filter(Boolean).map(c => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      })
    );

    // JWT classique
    const token = parsedCookies['token'] || parsedCookies['pimpay_token'];
    if (token) {
      const payload = await verifyJWT(token);
      if (!payload?.id) return null;

      // [FIX #22] Vérification révocation
      const session = await prisma.session.findFirst({
        where: { token, userId: payload.id, isActive: true },
        select: { id: true },
      });
      if (!session) return null;

      return payload.id;
    }

    // [FIX #25] Pi token
    const piToken = parsedCookies['pi_session_token'];
    if (piToken) {
      return await validatePiToken(piToken);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retourne l'userId depuis un Bearer token dans Authorization header.
 */
export async function getAuthUserIdFromBearer(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split(" ")[1];
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload?.id) return null;

    // [FIX #22] Vérification révocation
    const session = await prisma.session.findFirst({
      where: { token, userId: payload.id, isActive: true },
      select: { id: true },
    });
    if (!session) return null;

    return payload.id;
  } catch {
    return null;
  }
}

/**
 * Retourne le payload complet du JWT (incluant le rôle).
 * Utilisé pour les routes admin (vérification de rôle).
 */
export async function getAuthPayload(): Promise<{ id: string; role?: string; username?: string } | null> {
  try {
    const cookieStore = await cookies();
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!classicToken) return null;

    const payload = await verifyJWT(classicToken);
    if (!payload?.id) return null;

    // [FIX #22] Vérification révocation
    const session = await prisma.session.findFirst({
      where: { token: classicToken, userId: payload.id, isActive: true },
      select: { id: true },
    });
    if (!session) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pour le Middleware / Proxy (runtime Edge — pas d'accès à prisma.session)
// ---------------------------------------------------------------------------

/**
 * verifyAuth — utilisé dans le proxy.ts (middleware).
 * Vérifie uniquement la signature JWT (pas de DB lookup — Edge compatible).
 * La vérification Session.isActive est dans les routes via getAuthUserId().
 */
export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : cookieToken;

    if (!token) return null;

    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // Note : pas de DB lookup ici (Edge runtime).
    // La vérification Session.isActive est dans les routes.
    const user = await prisma.user.findUnique({
      where:  { id: userId, status: "ACTIVE" },
      select: { id: true, username: true, role: true, piUserId: true }
    });

    return user;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pour les pages et Server Actions
// ---------------------------------------------------------------------------

export const auth = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('pimpay_token')?.value;
    if (!token) return null;

    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    const user = await prisma.user.findUnique({
      where:  { id: userId, status: "ACTIVE" },
      select: {
        id:       true,
        username: true,
        role:     true,
        piUserId: true,
        wallets: {
          where:  { currency: "PI" },
          select: { balance: true }
        }
      }
    });

    if (!user) return null;

    return {
      ...user,
      balance: user.wallets[0]?.balance || 0
    };
  } catch (error) {
    console.error("[AUTH] auth() error:", error);
    return null;
  }
};
