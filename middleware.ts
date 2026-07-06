/**
 * middleware.ts
 * [FIX V25 + V27] Enhanced security middleware with CSRF and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfMiddleware } from '@/lib/csrf';
import { guardRequest } from '@/lib/defenseGuard';
import { getClientIp } from '@/lib/rate-limit';
import { logSuspiciousActivity } from '@/lib/secureLogger';

// Routes that don't require CSRF protection
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/public',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

// Routes that should use enhanced security
const SECURITY_ROUTES = [
  '/api/transfer',
  '/api/withdraw',
  '/api/deposit',
  '/api/admin',
  '/api/wallet',
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path));
}

function isSecurityRoute(pathname: string): boolean {
  return SECURITY_ROUTES.some(path => pathname.startsWith(path));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const ip = getClientIp(req);
  const method = req.method.toUpperCase();

  // [FIX V27] IDS - Defense Guard for all requests
  if (isSecurityRoute(pathname)) {
    const guard = await guardRequest(req as any, {
      context: `${method} ${pathname}`,
    });

    if (!guard.allowed) {
      await logSuspiciousActivity(
        'IDS_BLOCK',
        undefined,
        ip,
        guard.reason || 'IDS detection triggered',
        { path: pathname, blocked: guard.blockedByList }
      );

      return NextResponse.json(
        { error: 'Access denied - security policy violation' },
        { status: guard.status }
      );
    }
  }

  // [FIX V25] CSRF Protection for state-changing operations
  if (!isCsrfExempt(pathname) && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const isValidCsrf = validateCsrfMiddleware(req);

    if (!isValidCsrf) {
      await logSuspiciousActivity(
        'CSRF_ATTACK_DETECTED',
        undefined,
        ip,
        'CSRF token validation failed',
        { path: pathname, method }
      );

      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }
  }

  // [FIX V27] Security headers
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection (browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - strict
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - disable dangerous APIs
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), payment=(), usb=(), magnetometer=()'
  );

  // CSP - Content Security Policy [FIX V27]
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS - Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
