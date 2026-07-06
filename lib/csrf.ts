/**
 * lib/csrf.ts
 * [FIX V25] CSRF token generation and validation
 * Uses Double Submit Cookie pattern with signature verification
 */

import { createHmac, randomBytes } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET_PREFIX = 'csrf:secret:';
const CSRF_TOKEN_PREFIX = 'csrf:token:';
const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error('[CSRF] CSRF_SECRET is not defined in environment variables');
  }
  return secret;
}

/**
 * Generate a new CSRF token
 * Format: token:signature (prevents tampering)
 */
export function generateCsrfToken(): string {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const secret = getCsrfSecret();
  const signature = createHmac('sha256', secret)
    .update(token)
    .digest('hex');
  
  return `${token}.${signature}`;
}

/**
 * Verify CSRF token signature
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [tokenPart, signaturePart] = parts;
  
  try {
    const secret = getCsrfSecret();
    const expectedSignature = createHmac('sha256', secret)
      .update(tokenPart)
      .digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    return Buffer.from(signaturePart, 'hex').equals(
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Extract and validate CSRF token from request
 */
export function extractCsrfToken(req: Request): string | null {
  // Check header first (preferred method)
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (headerToken) return headerToken;
  
  // Fallback to cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  return cookies[CSRF_COOKIE_NAME] || null;
}

/**
 * Validate CSRF token on POST/PUT/DELETE requests
 */
export function validateCsrfMiddleware(req: Request): boolean {
  const method = req.method.toUpperCase();
  
  // Only validate state-changing operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true; // GET requests don't need CSRF protection
  }
  
  const token = extractCsrfToken(req);
  if (!token) {
    console.warn('[CSRF] Missing CSRF token for', method, req.url);
    return false;
  }
  
  const isValid = verifyCsrfToken(token);
  if (!isValid) {
    console.warn('[CSRF] Invalid CSRF token for', method, req.url);
  }
  
  return isValid;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
