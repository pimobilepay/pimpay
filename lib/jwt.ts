import * as jose from "jose";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secrets are not defined");
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
 * Sign a session token (default: 7 days expiration)
 * Use for regular login sessions
 */
export async function signSessionToken(
  payload: Record<string, unknown>,
  expirationTime: string = "7d"
): Promise<string> {
  const secret = getJwtSecret();

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Sign a short-lived token (default: 5 minutes)
 * Use for MFA verification, temporary tokens
 */
export async function signTempToken(
  payload: Record<string, unknown>,
  expirationTime: string = "5m"
): Promise<string> {
  const secret = getJwtSecret();

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Sign an access token (15 minutes expiration)
 * Use for API access
 */
export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return signTempToken(payload, "15m");
}

/**
 * Sign a refresh token (7 days expiration)
 */
export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
  const secret = getRefreshSecret();

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify a token and return the payload
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

/**
 * Verify access token (alias for verifyToken)
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
