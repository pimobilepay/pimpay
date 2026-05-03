import * as jose from "jose";

/**
 * lib/jwt.ts — Gestion des tokens JWT PimPay
 *
 * [FIX #22] Révocation des tokens JWT
 *
 * Problème initial : tokens valides 7 jours sans révocation possible.
 * La seule façon de révoquer était de changer JWT_SECRET (déconnecte tout le monde).
 *
 * Solution adoptée (compatible avec le schéma Prisma existant) :
 *   Le modèle Session possède déjà :
 *     - token    String @unique  → stocke le JWT brut
 *     - isActive Boolean         → flag de révocation
 *
 *   À la déconnexion ou en cas de compromission :
 *     → prisma.session.updateMany({ where: { token }, data: { isActive: false } })
 *
 *   Dans lib/auth.ts → verifyAuth() et getAuthUserId() :
 *     → vérifier que la Session correspondante a isActive = true AVANT de retourner l'userId
 *
 *   Durée des tokens :
 *     - Access token (session classique) : 15 minutes → renouvelé via refresh token
 *     - Refresh token                    : 7 jours    → stocké en Session, révocable
 *     - Temp token (MFA, reset)          : 5 minutes  → usage unique
 *
 *   ⚠️  Migration nécessaire :
 *     Les sessions existantes avec token 7d doivent être invalidées lors du déploiement.
 *     Exécuter : prisma.session.updateMany({ data: { isActive: false } })
 *     puis faire re-connecter tous les utilisateurs.
 */

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPayload {
  id:        string;
  role:      string;
  email?:    string;
  username?: string;
  piUserId?: string;
  purpose?:  string;
  userId?:   string;
}

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

/**
 * [FIX #22] signSessionToken — désormais durée 15 minutes par défaut.
 * Pour les sessions longues, utiliser signRefreshToken() et renouveler via
 * POST /api/auth/refresh avec le refresh token stocké en Session.
 *
 * Schéma de rotation :
 *   Login → émet (accessToken 15min + refreshToken 7j)
 *   Chaque requête API → vérifie accessToken via verifyToken()
 *   Si accessToken expiré → /api/auth/refresh → vérifie refreshToken dans Session (isActive=true)
 *                                             → émet un nouvel accessToken 15min
 *   Logout → Session.isActive = false → refreshToken révoqué immédiatement
 */
export async function signSessionToken(
  payload: Record<string, unknown>,
  expirationTime: string = "15m"   // [FIX #22] 15min au lieu de 7d
): Promise<string> {
  const secret = getJwtSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(generateJti()) // jti unique pour identifier le token (futur blacklist Redis)
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Token temporaire court (MFA, vérification email, reset password).
 * Par défaut : 5 minutes.
 */
export async function signTempToken(
  payload: Record<string, unknown>,
  expirationTime: string = "5m"
): Promise<string> {
  const secret = getJwtSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(generateJti())
    .setExpirationTime(expirationTime)
    .sign(secret);
}

/**
 * Access token (alias pour signSessionToken avec 15min explicite).
 */
export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return signSessionToken(payload, "15m");
}

/**
 * [FIX #22] Refresh token — 7 jours, signé avec JWT_REFRESH_SECRET.
 * Doit être stocké dans Session.token + Session.isActive = true.
 * La révocation se fait via Session.isActive = false (logout, compromission).
 */
export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
  const secret = getRefreshSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(generateJti())
    .setExpirationTime("7d")
    .sign(secret);
}

// ---------------------------------------------------------------------------
// Vérification
// ---------------------------------------------------------------------------

/**
 * Vérifie la signature et l'expiration d'un access token.
 * NE vérifie PAS isActive en base — cette vérification est dans lib/auth.ts.
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

/**
 * Alias sémantique pour verifyToken.
 */
export async function verifyAccessToken(token: string): Promise<jose.JWTPayload> {
  return verifyToken(token);
}

/**
 * Vérifie un refresh token (utilise JWT_REFRESH_SECRET).
 * À appeler dans POST /api/auth/refresh avant de vérifier Session.isActive.
 */
export async function verifyRefreshToken(token: string): Promise<jose.JWTPayload> {
  const secret = getRefreshSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Génère un identifiant unique de token (JWT ID).
 * Utilisé pour identifier un token spécifique dans une future blacklist Redis.
 */
function generateJti(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extrait le jti d'un token sans le vérifier (pour la blacklist).
 * Utile pour révoquer un token expiré dont on connaît le jti.
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
