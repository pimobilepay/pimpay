import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as jose from "jose"
import { cookies } from 'next/headers'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined in environment variables");
    return null;
  }
  return new TextEncoder().encode(secret);
};

// Verify JWT token and return payload
// [FIX V15] — Vérifie aussi que la Session correspondante est isActive = true en DB.
// Un token peut être cryptographiquement valide mais révoqué (logout, compromission).
export async function verifyJWT(token: string): Promise<{ id: string; role?: string; username?: string } | null> {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);

    if (!payload.id) return null;

    // Vérification de révocation : la session doit être active en DB.
    // Les access tokens (15min) sont liés à leur Session via le token brut.
    // Les temp tokens (5min, purpose: mfa_verification) sont exemptés car éphémères.
    if ((payload as any).purpose !== "mfa_verification") {
      const session = await prisma.session.findFirst({
        where: { token, isActive: true },
        select: { id: true },
      });
      if (!session) {
        // Session révoquée ou inexistante → token invalide
        return null;
      }
    }

    return {
      id:       payload.id as string,
      role:     payload.role as string | undefined,
      username: payload.username as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * [FIX V16 — CRITIQUE] Résolution SÉCURISÉE du cookie pi_session_token.
 *
 * Contexte : pi_session_token contient un JWT signé (émis par signSessionToken
 * au signup / pi-login), et NON un userId brut. Les anciennes versions
 * retournaient la valeur brute du cookie comme userId — permettant à un
 * attaquant de forger pi_session_token=<userId_victime> et d'usurper n'importe
 * quel compte (Broken Authentication / IDOR massif).
 *
 * Nouvelle logique — la valeur du cookie n'est JAMAIS approuvée telle quelle :
 *   1. On tente de la vérifier comme JWT signé (signature + session active en DB).
 *   2. À défaut, on la traite comme un vrai access token Pi Network et on le
 *      valide auprès de api.minepi.com/v2/me, puis on résout l'utilisateur via
 *      son piUserId. Le résultat est mis en cache court pour limiter les appels.
 */
const PI_TOKEN_CACHE = new Map<string, { userId: string; expires: number }>();
const PI_TOKEN_CACHE_TTL_MS = 60_000; // 1 minute

export async function verifyPiSessionToken(piToken: string | undefined | null): Promise<string | null> {
  if (!piToken || typeof piToken !== "string" || piToken.length < 10) return null;

  // 1. Vérification cryptographique : pi_session_token est normalement un JWT signé.
  const jwtPayload = await verifyJWT(piToken);
  if (jwtPayload?.id) return jwtPayload.id;

  // 2. Fallback : traiter la valeur comme un access token Pi Network et le valider
  //    auprès de l'API officielle Pi. On ne fait JAMAIS confiance au contenu local.
  const cached = PI_TOKEN_CACHE.get(piToken);
  if (cached && cached.expires > Date.now()) return cached.userId;

  try {
    const piRes = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${piToken}` },
      // Empêche toute mise en cache implicite d'une réponse d'auth
      cache: "no-store",
    });

    if (!piRes.ok) return null;

    const verified = await piRes.json().catch(() => null);
    const uid = verified?.uid;
    if (!uid) return null;

    const user = await prisma.user.findUnique({
      where: { piUserId: String(uid) },
      select: { id: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") return null;

    PI_TOKEN_CACHE.set(piToken, { userId: user.id, expires: Date.now() + PI_TOKEN_CACHE_TTL_MS });
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user ID from cookies (supports Pi Browser and classic tokens)
 * This is the primary auth helper for API routes
 *
 * [FIX V16] — Plus aucune confiance dans la valeur brute d'un cookie. Le JWT
 * classique et le pi_session_token sont tous deux vérifiés cryptographiquement.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();

    // 1. JWT classique en priorité (vérification cryptographique réelle)
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (payload?.id) return payload.id;
    }

    // 2. Pi Browser token — vérifié (signature JWT, sinon validation API Pi)
    const piToken = cookieStore.get("pi_session_token")?.value;
    return await verifyPiSessionToken(piToken);
  } catch {
    return null;
  }
}

/**
 * Get authenticated user ID from request headers (for CORS/Pi Browser scenarios)
 * Use this when cookies() is not available or for manual cookie parsing
 */
export async function getAuthUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookies = Object.fromEntries(
      cookieHeader.split('; ').filter(Boolean).map(c => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      })
    );
    
    // Classic JWT tokens en priorité (vérification cryptographique réelle)
    const token = parsedCookies['token'] || parsedCookies['pimpay_token'];
    if (token) {
      const payload = await verifyJWT(token);
      if (payload?.id) return payload.id;
    }

    // [FIX V16] Pi Browser token — vérifié (signature JWT, sinon validation API Pi).
    // NE JAMAIS retourner la valeur brute du cookie : c'était la faille d'usurpation.
    const piToken = parsedCookies['pi_session_token'];
    return await verifyPiSessionToken(piToken);
  } catch {
    return null;
  }
}

/**
 * Get authenticated user ID from Bearer token in Authorization header
 * Use for APIs that receive tokens via Authorization: Bearer <token>
 * 
 * [FIX V16] — Vérifie désormais la révocation de session : si une Session
 * correspondante existe en DB, elle DOIT être isActive = true. Cela bloque un
 * token volé après déconnexion. Les tokens sans session en DB (legacy
 * localStorage) restent tolérés pour compatibilité.
 */
export async function getAuthUserIdFromBearer(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    
    // Vérification cryptographique de la signature + expiration
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = (payload.id as string) || null;
    if (!userId) return null;

    // Révocation : si une session existe pour ce token, elle doit être active.
    const session = await prisma.session.findFirst({
      where: { token },
      select: { isActive: true },
    });
    if (session && !session.isActive) return null;

    return userId;
  } catch {
    return null;
  }
}

/**
 * Get full JWT payload from cookies (includes role)
 * Use when you need role verification for admin routes
 */
export async function getAuthPayload(): Promise<{ id: string; role?: string; username?: string } | null> {
  try {
    const cookieStore = await cookies();
    
    // Pi Browser token doesn't have role info, so skip it for admin routes
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!classicToken) return null;
    
    return await verifyJWT(classicToken);
  } catch {
    return null;
  }
}

// 1. Pour le Middleware
export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (!token) return null;

    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: { 
        id: true, 
        username: true, 
        role: true,
        piUserId: true // Utile pour les transactions Pi Network
      }
    });

    return user;
  } catch (error) {
    return null;
  }
}

// 2. Pour tes pages et Server Actions
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
      where: { id: userId, status: "ACTIVE" },
      select: {
        id: true,
        username: true,
        role: true,
        piUserId: true,
        // Pour récupérer le solde, on passe par la relation 'wallets'
        wallets: {
          where: { currency: "PI" },
          select: { balance: true }
        }
      }
    });

    if (!user) return null;

    // On transforme un peu l'objet pour qu'il soit plus facile à utiliser
    return {
      ...user,
      balance: user.wallets[0]?.balance || 0 // On aplatit la balance ici
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
