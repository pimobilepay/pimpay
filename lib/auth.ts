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
export async function verifyJWT(token: string): Promise<{ id: string; role?: string; username?: string } | null> {
  try {
    const secret = getJwtSecret();
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, secret);
    
    if (!payload.id) return null;
    
    return {
      id: payload.id as string,
      role: payload.role as string | undefined,
      username: payload.username as string | undefined,
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Get authenticated user ID from cookies (supports Pi Browser and classic tokens)
 * This is the primary auth helper for API routes
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    
    // Pi Browser token (direct userId)
    const piToken = cookieStore.get("pi_session_token")?.value;
    if (piToken) {
      return piToken;
    }
    
    // Classic JWT tokens
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!classicToken) return null;
    
    const payload = await verifyJWT(classicToken);
    return payload?.id || null;
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
