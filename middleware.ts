import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes qui nécessitent absolument une connexion Pi
 * Ajout de /dashboard ici pour qu'il soit protégé mais accessible si connecté
 */
const PROTECTED_ROUTES = ['/dashboard', '/wallet', '/profile', '/api/payments'];

/**
 * Routes toujours accessibles
 */
const PUBLIC_ROUTES = ['/auth/login', '/', '/api/auth/pi-login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. On récupère le token de session
  const sessionToken = request.cookies.get('pi_session_token')?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // CAS A : Accès à une zone protégée SANS session
  if (isProtectedRoute && !sessionToken) {
    // Si on n'est pas connecté, on redirige vers l'accueil (ou login)
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CAS B : Déjà connecté et essaie d'aller sur login -> Go Dashboard
  if (pathname === '/login' && sessionToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * On exclut les fichiers statiques et les routes d'auth pour éviter les boucles
     */
    '/((?!api/auth/pi-login|_next/static|_next/image|favicon.ico|images|public).*)',
  ],
};

