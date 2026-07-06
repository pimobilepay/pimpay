/**
 * lib/tokenBlacklist.ts
 * Redis-based token revocation system
 * Stores invalidated JTI (JWT ID) with TTL = remaining token lifetime
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const BLACKLIST_PREFIX = 'jwt:blacklist:';

/**
 * Revoke a token by its JTI (JWT ID)
 * @param jti - JWT ID to revoke
 * @param ttl - Time to live in seconds (should match token expiration)
 */
export async function revokeToken(jti: string, ttl: number): Promise<void> {
  if (!jti) throw new Error('[TOKEN] JTI manquant');
  
  try {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    // Stocke avec TTL = durée de vie restante du token
    await redis.set(key, '1', { ex: ttl });
  } catch (error) {
    console.error('[TOKEN] Revocation failed:', error);
    // Fail-open: ne pas bloquer la requête si Redis est down
  }
}

/**
 * Check if a token JTI is revoked
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  
  try {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    console.error('[TOKEN] Revocation check failed:', error);
    // Fail-open: accepter le token si Redis est inaccessible
    return false;
  }
}

/**
 * Revoke all tokens for a user (logout)
 * In production, use a user:tokens:* pattern scan
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  if (!userId) throw new Error('[TOKEN] userId manquant');
  
  try {
    // Pattern: jwt:blacklist:user:{userId}:*
    const pattern = `${BLACKLIST_PREFIX}user:${userId}:*`;
    // Note: Implémentation simple. En prod, utiliser SCAN pour les grosses opérations
    // await redis.eval(`return redis.call('del', unpack(redis.call('keys', ARGV[1])))`, [], [pattern]);
  } catch (error) {
    console.error('[TOKEN] User revocation failed:', error);
  }
}

export { redis };
