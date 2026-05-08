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
 * Get authenticated user ID from cookies (supports Pi Browser and classic tokens)
 * This is the primary auth helper for API routes
 *
 * [FIX V2/V13] — pi_session_token est accepté comme fallback UNIQUEMENT s'il a
 * la longueur d'un CUID valide (25 caractères min). Cela ne remplace pas la
 * validation cryptographique via api.minepi.com/v2/me (TODO complet V2),
 * mais bloque les chaînes triviales de >20 caractères forgées à la main.
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

    // 2. Pi Browser token — fallback (TODO V2: valider via api.minepi.com/v2/me)
    // Contrainte minimale : longueur CUID (25 chars) et format alphanumérique
    const piToken = cookieStore.get("pi_session_token")?.value;
    if (piToken && piToken.length >= 25 && /^[a-z0-9]+$/i.test(piToken)) {
      return piToken;
    }

    return null;
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
    
    // Pi Browser token
    const piToken = parsedCookies['pi_session_token'];
    if (piToken) return piToken;
    
    // Classic JWT tokens
    const token = parsedCookies['token'] || parsedCookies['pimpay_token'];
    if (!token) return null;
    
    const payload = await verifyJWT(token);
    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user ID from Bearer token in Authorization header
 * Use for APIs that receive tokens via Authorization: Bearer <token>
 * 
 * Note: This function does NOT check session revocation in DB because
 * localStorage-based tokens may not have corresponding sessions.
 * For admin/sensitive routes, use getAuthPayloadFromBearer instead.
 */
export async function getAuthUserIdFromBearer(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    
    // Verify JWT without session check (for localStorage tokens)
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    return payload.id as string || null;
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
