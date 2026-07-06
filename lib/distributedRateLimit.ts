/**
 * lib/distributedRateLimit.ts
 * [FIX V28] Upstash Redis-backed rate limiting for distributed environments
 * Replaces in-memory store with Redis for multi-region consistency
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

const RATE_LIMIT_PREFIX = 'ratelimit:';
const RATE_LIMIT_TTL = 3600; // 1 hour default

/**
 * Check rate limit using Redis INCR with TTL
 * Atomic operation - no race conditions
 */
export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  try {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const now = Date.now();
    const resetAt = now + windowSeconds * 1000;

    // INCR is atomic - increments counter or initializes to 1
    const count = await redis.incr(redisKey);

    // Set expiration on first increment (when count === 1)
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const limited = count > limit;
    const retryAfter = limited ? Math.ceil((resetAt - now) / 1000) : 0;

    return {
      limited,
      remaining,
      resetAt,
      retryAfter,
    };
  } catch (error) {
    console.error('[RATELIMIT] Redis error:', error);
    // Fail-open: don't block legitimate traffic if Redis is down
    return {
      limited: false,
      remaining: 1,
      resetAt: Date.now() + 60000,
      retryAfter: 0,
    };
  }
}

/**
 * Reset rate limit for a key (admin use)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    await redis.del(redisKey);
  } catch (error) {
    console.error('[RATELIMIT] Reset error:', error);
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(key: string, limit: number): Promise<RateLimitResult> {
  try {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const count = await redis.get<number>(redisKey);
    const ttl = await redis.ttl(redisKey);
    
    const currentCount = count || 0;
    const remaining = Math.max(0, limit - currentCount);
    const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now();
    
    return {
      limited: currentCount > limit,
      remaining,
      resetAt,
      retryAfter: currentCount > limit ? ttl : 0,
    };
  } catch (error) {
    console.error('[RATELIMIT] Status error:', error);
    return {
      limited: false,
      remaining: 1,
      resetAt: Date.now() + 60000,
      retryAfter: 0,
    };
  }
}

/**
 * Predefined rate limit presets
 */
export const RATE_LIMITS = {
  LOGIN: { limit: 10, window: 60 }, // 10 per minute
  TRANSFER: { limit: 20, window: 60 },
  WITHDRAW: { limit: 20, window: 60 },
  DEPOSIT: { limit: 30, window: 60 },
  API_GENERAL: { limit: 100, window: 60 },
  PASSWORD_RESET: { limit: 3, window: 300 }, // 3 per 5 minutes
  MFA_VERIFY: { limit: 5, window: 60 },
} as const;

export { redis };
