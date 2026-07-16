import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as jose from "jose"
import { cookies } from 'next/headers'
import { isTokenRevoked } from '@/lib/tokenBlacklist'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined in environment variables");
    return null;
  }
  return new TextEncoder().encode(secret);
};

/**
 * [FIX V16 + V23] — Verify JWT token with revocation check
 * Checks:
 *   1. Signature validity
 *   2. Expiration
 *   3. JTI revocation status (blacklist)
 *   4. Session active status in DB
 *   5. User account status
 */
export async function verifyJWT(token: string): Promise<{ id: string; role?: string; username?: string; jti?: string } | null> {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);

    if (!payload.id) return null;

    const jti = payload.jti as string | undefined;

    // [FIX V23] Check if token JTI is revoked (blacklist)
    if (jti && await isTokenRevoked(jti)) {
      return null; // Token revoqué
    }

    // Vérification de révocation, SCOPÉE à l'utilisateur du token.
    // BUG CORRIGÉ : auparavant on cherchait n'importe quelle session active
    // dans toute la base (`findFirst({ where: { isActive: true } })`), ce qui
    // renvoyait 401 à TOUS les utilisateurs dès que la table sessions était
    // vide/purgée. On vérifie désormais les sessions de CET utilisateur :
    // l'accès n'est révoqué que s'il possède des sessions mais aucune active
    // (déconnexion explicite). Un utilisateur sans session (ex: certains flux
    // Pi) n'est pas bloqué.
    if ((payload as any).purpose !== "mfa_verification") {
      const uid = payload.id as string;
      const [activeCount, totalCount] = await Promise.all([
        prisma.session.count({ where: { userId: uid, isActive: true } }),
        prisma.session.count({ where: { userId: uid } }),
      ]);
      if (totalCount > 0 && activeCount === 0) {
        return null;
      }
    }

    // [FIX V23] Vérifier que l'utilisateur existe et est ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return {
      id: payload.id as string,
      role: payload.role as string | undefined,
      username: payload.username as string | undefined,
      jti,
    };
  } catch {
    return null;
  }
}

/**
 * [FIX V23 CRITICAL] — Secure Pi Session Token Verification
 * 
 * FAILLE CORRIGÉE: Anciennement acceptait n'importe quel uid sans validation.
 * Maintenant:
 *   1. Vérifie la signature JWT d'abord
 *   2. Valide contre Pi API UNIQUEMENT si JWT échoue
 *   3. Vérifie que piUserId existe ET que user.status = ACTIVE
 *   4. Cache court pour limiter les appels (1 min)
 */
const PI_TOKEN_CACHE = new Map<string, { userId: string; expires: number }>();
const PI_TOKEN_CACHE_TTL_MS = 60_000; // 1 minute

export async function verifyPiSessionToken(piToken: string | undefined | null): Promise<string | null> {
  if (!piToken || typeof piToken !== "string" || piToken.length < 10) return null;

  // 1. Vérification cryptographique : pi_session_token est normalement un JWT signé.
  const jwtPayload = await verifyJWT(piToken);
  if (jwtPayload?.id) return jwtPayload.id;

  // 2. Fallback : traiter la valeur comme un access token Pi Network
  const cached = PI_TOKEN_CACHE.get(piToken);
  if (cached && cached.expires > Date.now()) return cached.userId;

  try {
    const piRes = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${piToken}` },
      cache: "no-store",
      // [FIX V23] Timeout pour éviter les slowloris
      signal: AbortSignal.timeout(5000),
    });

    if (!piRes.ok) return null;

    const verified = await piRes.json().catch(() => null);
    const uid = verified?.uid;
    if (!uid || typeof uid !== 'string') return null;

    // [FIX V23 CRITICAL] Validation stricte du piUserId
    const user = await prisma.user.findUnique({
      where: { piUserId: String(uid) },
      select: { id: true, status: true, email: true },
    });

    // [FIX V23] Vérifier ACTIVE status + existence
    if (!user || user.status !== "ACTIVE") {
      // Log suspicious activity
      if (user && user.status !== "ACTIVE") {
        console.warn(`[AUTH] Inactive Pi user attempted login: ${user.email} (${uid})`);
      }
      return null;
    }

    PI_TOKEN_CACHE.set(piToken, { userId: user.id, expires: Date.now() + PI_TOKEN_CACHE_TTL_MS });
    return user.id;
  } catch (error) {
    console.error('[AUTH] Pi token verification error:', error);
    return null;
  }
}

/**
 * Get authenticated user ID from cookies (supports Pi Browser and classic tokens)
 * [FIX V23] — Plus aucune confiance dans la valeur brute d'un cookie.
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
    
    // Classic JWT tokens en priorité
    const token = parsedCookies['token'] || parsedCookies['pimpay_token'];
    if (token) {
      const payload = await verifyJWT(token);
      if (payload?.id) return payload.id;
    }

    // [FIX V23] Pi Browser token — vérifié
    const piToken = parsedCookies['pi_session_token'];
    return await verifyPiSessionToken(piToken);
  } catch {
    return null;
  }
}

/**
 * Get authenticated user ID from Bearer token
 * [FIX V16 + V17 + V23] — Token revocation check added
 */
export async function getAuthUserIdFromBearer(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = (payload.id as string) || null;
    const jti = payload.jti as string | undefined;
    if (!userId) return null;

    // [FIX V23] Check JTI revocation
    if (jti && await isTokenRevoked(jti)) {
      return null;
    }

    // [FIX] Révocation scopée à CET utilisateur — même logique que verifyJWT().
    // L'ancienne requête (`findFirst({ where: { isActive: true } })`, sans
    // filtre userId) était tautologique : en filtrant déjà sur isActive:true,
    // `session.isActive` valait toujours true si une session était trouvée,
    // donc `!session.isActive` n'était jamais vrai. Un token Bearer volé
    // restait donc valide même après "déconnecter tous les appareils".
    if ((payload as any).purpose !== "mfa_verification") {
      const [activeCount, totalCount] = await Promise.all([
        prisma.session.count({ where: { userId, isActive: true } }),
        prisma.session.count({ where: { userId } }),
      ]);
      if (totalCount > 0 && activeCount === 0) return null;
    }

    // Le compte doit exister et être ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") return null;

    return userId;
  } catch {
    return null;
  }
}

/**
 * Get full JWT payload from cookies (includes role)
 */
export async function getAuthPayload(): Promise<{ id: string; role?: string; username?: string; jti?: string } | null> {
  try {
    const cookieStore = await cookies();
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!classicToken) return null;
    
    return await verifyJWT(classicToken);
  } catch {
    return null;
  }
}

/**
 * Verify auth for middleware
 */
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
    const jti = payload.jti as string | undefined;

    // [FIX V23] Check JTI revocation
    if (jti && await isTokenRevoked(jti)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: { 
        id: true, 
        username: true, 
        role: true,
        piUserId: true
      }
    });

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Server-side auth helper
 */
export const auth = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('pimpay_token')?.value;

    if (!token) return null;

    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;
    const jti = payload.jti as string | undefined;

    // [FIX V23] Check JTI revocation
    if (jti && await isTokenRevoked(jti)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: {
        id: true,
        username: true,
        role: true,
        piUserId: true,
        wallets: {
          where: { currency: "PI" },
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
    console.error("Auth error:", error);
    return null;
  }
}
