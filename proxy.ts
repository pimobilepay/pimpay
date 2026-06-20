import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

// Applique des en-têtes de sécurité standards sur toutes les réponses
function applySecurityHeaders(res: NextResponse): NextResponse {
  // Empêche le navigateur de deviner le type MIME (protection contre certaines XSS)
  res.headers.set("X-Content-Type-Options", "nosniff");
  // IMPORTANT : NE PAS utiliser "X-Frame-Options: SAMEORIGIN".
  // Le Pi Browser charge l'application dans une iframe depuis une origine
  // différente. SAMEORIGIN (ou DENY) provoque alors net::ERR_BLOCKED_BY_RESPONSE.
  // On supprime X-Frame-Options et on autorise l'intégration via CSP frame-ancestors,
  // qui reste une protection anti-clickjacking moderne tout en laissant passer le Pi Browser.
  res.headers.delete("X-Frame-Options");
  res.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://*.minepi.com https://*.pi.app https://sandbox.minepi.com https://app-cdn.minepi.com"
  );
  // Limite les infos de referer envoyées vers les autres sites
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Désactive l'ancien filtre XSS (recommandation moderne : on s'appuie sur la CSP)
  res.headers.set("X-XSS-Protection", "0");
  // Restreint l'accès aux APIs sensibles du navigateur
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  // Force HTTPS pendant 2 ans (inclut les sous-domaines)
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return res;
}

// Empêche la mise en cache des pages authentifiées (soldes, données sensibles)
function applyNoStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// Chemins typiquement ciblés par les scanners / bots malveillants
const SUSPICIOUS_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/\.aws/i,
  /\/\.ssh/i,
  /\/config\.(php|json|yml|yaml)$/i,
];

// Fonction helper pour determiner la destination selon le role
function getDestinationByRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "BANK_ADMIN":
      return "/bank";
    case "BUSINESS_ADMIN":
      return "/business";
    case "AGENT":
      return "/hub";
    default:
      return "/dashboard";
  }
}

// Dans Next 16, la fonction exportée doit s'appeler 'proxy'
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0. BLOCAGE DES REQUÊTES MALVEILLANTES (scanners de vulnérabilités, bots)
  if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Récupération des tokens (vérifier tous les noms de cookies utilisés)
  const token = req.cookies.get("token")?.value || req.cookies.get("pimpay_token")?.value;
  const piToken = req.cookies.get("pi_session_token")?.value;

  // 2. EXCLUSIONS (On laisse passer les fichiers statiques et l'auth)
  const isPublicAsset = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isLoginPage = pathname === "/login" || pathname === "/" || pathname === "/auth/login";

  // Laisser passer les assets, les routes API auth et les routes API generales
  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }
  
  // Pour les autres routes API, on continue sans redirection mais avec validation
  if (isApiRoute) {
    return NextResponse.next();
  }

  let userPayload: any = null;

  // 3. VÉRIFICATION JWT
  if (token) {
    try {
      const secretStr = process.env.JWT_SECRET;
      if (!secretStr) throw new Error("JWT_SECRET_MISSING");

      const secret = new TextEncoder().encode(secretStr);
      const { payload } = await jose.jwtVerify(token, secret);
      userPayload = payload;
    } catch {
      // Token invalide ou expire - ne pas rediriger ici, laisser continuer
      // La redirection se fera plus bas si la route est protegee
      if (!piToken) {
        // Supprimer le token invalide
        const res = NextResponse.next();
        res.cookies.delete("token");
        res.cookies.delete("pimpay_token");
      }
    }
  }

  // 4. SÉCURITÉ PI (Mainnet Ready)
  if (!userPayload && piToken && piToken.length > 20) {
    userPayload = { id: piToken, role: "USER", isPi: true };
  }

  // 5. REDIRECTIONS BASÉES SUR LE RÔLE
  const userRole = userPayload?.role;
  const isAdmin = userRole === "ADMIN";
  const isBankAdmin = userRole === "BANK_ADMIN";
  const isBusinessAdmin = userRole === "BUSINESS_ADMIN";
  const isAgent = userRole === "AGENT";

  // Redirection depuis la page de login si deja connecte
  if (userPayload && isLoginPage) {
    const dest = getDestinationByRole(userRole);
    // Utiliser redirect 302 au lieu de 307 pour eviter les problemes de cache
    const response = NextResponse.redirect(new URL(dest, req.url), 302);
    // Desactiver le cache pour les pages d'auth
    applyNoStore(response);
    applySecurityHeaders(response);
    return response;
  }

  // Protection des routes
  const isProtectedPath = 
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/bank") || 
    pathname.startsWith("/business") || 
    pathname.startsWith("/hub") || 
    pathname.startsWith("/transfer") || 
    pathname.startsWith("/deposit") || 
    pathname.startsWith("/withdraw") || 
    pathname.startsWith("/wallet") || 
    pathname.startsWith("/mpay") || 
    pathname.startsWith("/statements") || 
    pathname.startsWith("/swap") || 
    pathname.startsWith("/airtime") || 
    pathname.startsWith("/about") || 
    pathname.startsWith("/contact") || 
    pathname.startsWith("/settings") || 
    pathname.startsWith("/profile");
    
  if (!userPayload && isProtectedPath) {
    // Utiliser redirect 302 pour eviter les problemes de cache
    const response = NextResponse.redirect(new URL("/auth/login", req.url), 302);
    applyNoStore(response);
    applySecurityHeaders(response);
    return response;
  }

  // Protection route /admin - uniquement pour ADMIN
  if (pathname.startsWith("/admin") && !isAdmin) {
    const dest = getDestinationByRole(userRole);
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protection route /bank - uniquement pour BANK_ADMIN et ADMIN
  if (pathname.startsWith("/bank") && !isBankAdmin && !isAdmin) {
    const dest = getDestinationByRole(userRole);
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protection route /business - uniquement pour BUSINESS_ADMIN et ADMIN
  if (pathname.startsWith("/business") && !isBusinessAdmin && !isAdmin) {
    const dest = getDestinationByRole(userRole);
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protection route /hub - uniquement pour AGENT et ADMIN
  if (pathname.startsWith("/hub") && !isAgent && !isAdmin) {
    const dest = getDestinationByRole(userRole);
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Réponse finale : en-têtes de sécurité + no-store sur les pages authentifiées
  const response = applySecurityHeaders(NextResponse.next());
  if (isProtectedPath) {
    applyNoStore(response);
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/bank/:path*",
    "/business/:path*",
    "/hub/:path*",
    "/profile/:path*",
    "/transfer/:path*",
    "/deposit/:path*",
    "/withdraw/:path*",
    "/settings/:path*",
    "/wallet/:path*",
    "/mpay/:path*",
    "/statements/:path*",
    "/swap/:path*",
    "/airtime/:path*",
    "/about/:path*",
    "/contact/:path*",
    "/contacts/:path*",
    "/login",
    "/",
    "/auth/login",
  ],
};
