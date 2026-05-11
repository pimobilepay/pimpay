/**
 * lib/cors.ts — Gestion CORS centralisée PimPay
 *
 * [FIX N2] Remplace le wildcard Access-Control-Allow-Origin: * par une
 * liste blanche d'origines explicites.
 *
 * Problème initial :
 *   4 routes de swap + next.config.js utilisaient Allow-Origin: *
 *   → N'importe quel site malveillant pouvait appeler les APIs financières
 *     dans le contexte d'un utilisateur authentifié (cookies inclus).
 *   → Note : Allow-Origin: * + Allow-Credentials: true est bloqué par les
 *     navigateurs, mais les routes sans credentials restaient exposées.
 *
 * Solution :
 *   getCorsHeaders(request) retourne les headers CORS avec l'origine exacte
 *   si elle est dans la whitelist, sinon null (requête bloquée).
 *   Utilisé dans les routes qui ont besoin de CORS (swap, Pi Browser).
 */

const ALLOWED_ORIGINS: string[] = [
  // Production PimPay — défini dans les variables d'environnement Vercel
  process.env.NEXT_PUBLIC_APP_URL ?? "",
  // Pi Browser et SDK Pi Network
  "https://minepi.com",
  "https://app.minepi.com",
  "https://sdk.minepi.com",
].filter(Boolean);

const CORS_METHODS = "POST, GET, OPTIONS";
const CORS_HEADERS_ALLOWED =
  "Content-Type, Authorization, X-Requested-With";

/**
 * Retourne les headers CORS pour une origine autorisée.
 *
 * @param request  La requête entrante (Request | NextRequest)
 * @returns        Headers CORS à inclure dans la réponse, ou headers de refus
 *
 * Usage dans une route :
 *   const cors = getCorsHeaders(req);
 *   return NextResponse.json(data, { headers: cors });
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";

  // En développement local, autoriser toutes les origines localhost
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    (origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1"));

  const isAllowed = isLocalDev || ALLOWED_ORIGINS.includes(origin);

  if (!isAllowed) {
    // Origine non autorisée — retourner des headers neutres sans Allow-Origin
    // Le navigateur bloquera la réponse côté client (pas d'Access-Control-Allow-Origin)
    return {
      "X-Content-Type-Options": "nosniff",
    };
  }

  return {
    // Origine explicite — jamais de wildcard *
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS_ALLOWED,
    // Nécessaire pour que les cookies de session soient transmis
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

/**
 * Réponse preflight OPTIONS pour les routes CORS.
 * À appeler dans l'export OPTIONS de chaque route concernée.
 *
 * Usage :
 *   export async function OPTIONS(req: Request) {
 *     return corsPreflightResponse(req);
 *   }
 */
export function corsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
