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
