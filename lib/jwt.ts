import * as jose from "jose";
import { revokeToken } from '@/lib/tokenBlacklist';

/**
 * lib/jwt.ts — Gestion sécurisée des tokens JWT PimPay
 *
 * [FIX #23] — Révocation complète avec Redis + JTI blacklist
 * [FIX #22] — Durée limitée des tokens (15min access, 7j refresh)
 *
 * Schéma:
 *   - Access Token (15min): Utilisé à chaque API call, court-lived
 *   - Refresh Token (7j): Stocké en DB Session, révocable immédiatement
 *   - Temp Token (5min): MFA, password reset, email verification
 */

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_SECRET est manquant — l'application ne peut pas démarrer");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_REFRESH_SECRET (ou JWT_SECRET) est manquant");
  }
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  id: string;
  role: string;
  email?: string;
  username?: string;
  piUserId?: string;
  purpose?: string;
  userId?: string;
  jti?: string;
}

/**
 * [FIX #23] Generate unique JWT ID (JTI) for revocation tracking
 */
function generateJti(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * [FIX #23] Extract JTI from token without verification (for blacklist operations)
 */
export function extractJtiUnsafe(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload.jti || null;
  } catch {
    return null;
  }
}

/**
 * [FIX #23] Sign session token - 15 minutes by default
 */
export async function signSessionToken(
  payload: Record<string, unknown>,
  expirationTime: string = "15m"
): Promise<string> {
  const secret = getJwtSecret();
  const jti = generateJti();
  
  return await new jose.SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Temporary token - 5 minutes for MFA/reset/verification
 */
export async function signTempToken(
  payload: Record<string, unknown>,
  expirationTime: string = "5m"
): Promise<string> {
  const secret = getJwtSecret();
  const jti = generateJti();
  
  return await new jose.SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Access token alias
 */
export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return signSessionToken(payload, "15m");
}

/**
 * [FIX #23] Refresh token - 7 days, stored in Session DB for revocation
 */
export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
  const secret = getRefreshSecret();
  const jti = generateJti();
  
  return await new jose.SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify token signature and expiration
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

/**
 * Alias for verifyToken
 */
export async function verifyAccessToken(token: string): Promise<jose.JWTPayload> {
  return verifyToken(token);
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<jose.JWTPayload> {
  const secret = getRefreshSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

/**
 * [FIX #23] Revoke a token immediately
 * Used on logout or security events
 */
export async function revokeTokenJWT(token: string, ttlSeconds: number = 900): Promise<void> {
  const jti = extractJtiUnsafe(token);
  if (jti) {
    await revokeToken(jti, ttlSeconds);
  }
}
