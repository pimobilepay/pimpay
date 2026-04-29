import * as jose from "jose";

/**
 * SECURITY FIXES [MOYEN] — lib/jwt.ts
 *
 * 1. JWT_REFRESH_SECRET ne retombe PLUS sur JWT_SECRET.
 *    Si JWT_REFRESH_SECRET est absent, une exception est levée au démarrage.
 *    Cela empêche d'utiliser un access token comme refresh token.
 *
 * 2. Durée des sessions réduite de 7 jours → 24 heures.
 *    Les refresh tokens restent à 7 jours pour le renouvellement silencieux.
 *
 * 3. Le payload inclut un claim "type" pour distinguer access / refresh tokens.
 */

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  // FIX [MOYEN]: plus de fallback sur JWT_SECRET — clé dédiée obligatoire
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined. " +
        "Configurez une clé distincte de JWT_SECRET dans votre .env."
    );
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
}

/**
 * Sign a session token — durée réduite à 24h (était 7 jours).
 * Utiliser signRefreshToken() pour les sessions longues.
 */
export async function signSessionToken(
  payload: Record<string, unknown>,
  expirationTime: string = "24h" // FIX : 7d → 24h
): Promise<string> {
  const secret = getJwtSecret();
  return await new jose.SignJWT({ ...payload, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Sign a short-lived token (default: 5 minutes).
 * Use for MFA verification, temporary tokens.
 */
export async function signTempToken(
  payload: Record<string, unknown>,
  expirationTime: string = "5m"
): Promise<string> {
  const secret = getJwtSecret();
  return await new jose.SignJWT({ ...payload, type: "temp" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Sign an access token (15 minutes expiration).
 */
export async function signAccessToken(
  payload: Record<string, unknown>
): Promise<string> {
  return signTempToken(payload, "15m");
}

/**
 * Sign a refresh token (7 days) — signé avec JWT_REFRESH_SECRET.
 */
export async function signRefreshToken(
  payload: Record<string, unknown>
): Promise<string> {
  const secret = getRefreshSecret(); // FIX: clé dédiée
  return await new jose.SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify a session/access token.
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

export async function verifyAccessToken(token: string): Promise<jose.JWTPayload> {
  return verifyToken(token);
}

/**
 * Verify a refresh token — utilise JWT_REFRESH_SECRET (distinct).
 */
export async function verifyRefreshToken(
  token: string
): Promise<jose.JWTPayload> {
  const secret = getRefreshSecret(); // FIX: clé dédiée
  const { payload } = await jose.jwtVerify(token, secret);
  // Vérifier que c'est bien un refresh token et non un access token réutilisé
  if (payload.type !== "refresh") {
    throw new Error("Token type invalide : refresh token attendu");
  }
  return payload;
}
