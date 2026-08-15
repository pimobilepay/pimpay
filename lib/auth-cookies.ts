/**
 * Options de cookies d'authentification centralisées.
 *
 * [CONTEXTE Pi Browser / iOS]
 * L'application est chargée dans une iframe cross-origin (Pi Browser). Pour que
 * les cookies de session survivent dans ce contexte, ils doivent être posés avec
 * `SameSite=None; Secure`.
 *
 * Sur iPhone (WebKit / Safari) et sur les navigateurs récents qui bloquent les
 * cookies tiers, un cookie `SameSite=None; Secure` classique posé depuis une
 * iframe tierce peut être refusé. La solution standard est CHIPS : l'attribut
 * `Partitioned`.
 *
 * MAIS `Partitioned` seul CASSE les navigateurs (et l'ancien Pi Browser Android)
 * qui ne le gèrent pas correctement : le cookie n'est plus renvoyé → boucle de
 * déconnexion / "Authentification requise".
 *
 * SOLUTION (migration CHIPS recommandée) : poser CHAQUE cookie d'auth EN DOUBLE
 *   1. version classique NON partitionnée (SameSite=None; Secure)
 *   2. version `Partitioned` (CHIPS)
 * Le navigateur stocke et renvoie celle qu'il supporte :
 *   - Android / desktop / ancien Pi Browser → cookie classique (comme avant le fix)
 *   - iOS 16.4+ / navigateurs à cookies tiers bloqués → cookie Partitioned
 *
 * En développement (localhost, HTTP), on garde `SameSite=Lax` sans `Secure` ni
 * `Partitioned` pour ne pas casser le flux local.
 */

import type { NextResponse } from "next/server";

type AuthCookieOptions = {
  /** Durée de vie en secondes. Passer 0 pour supprimer le cookie. */
  maxAge?: number;
  /** Chemin du cookie. Par défaut "/". */
  path?: string;
  /** httpOnly. Par défaut true. Certains cookies (ex: signup) sont lisibles côté client. */
  httpOnly?: boolean;
};

/**
 * Options du cookie de session NON partitionné.
 * Restaure le comportement qui fonctionnait avant le fix iOS (Android/desktop).
 */
export function buildAuthCookieOptions({
  maxAge,
  path = "/",
  httpOnly = true,
}: AuthCookieOptions = {}) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly,
    secure: isProduction,
    // En iframe cross-origin (Pi Browser), SameSite doit valoir "none".
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path,
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

/**
 * Sérialise la variante `Partitioned` (CHIPS) d'un cookie d'auth.
 * Retourne null hors production car Partitioned exige Secure (HTTPS).
 */
function buildPartitionedSetCookie(
  name: string,
  value: string,
  { maxAge, path = "/", httpOnly = true }: AuthCookieOptions = {},
): string | null {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return null;

  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    "Secure",
    "SameSite=None",
    "Partitioned",
  ];
  if (httpOnly) parts.push("HttpOnly");
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);

  return parts.join("; ");
}

/**
 * Pose un cookie d'authentification EN DOUBLE (classique + Partitioned).
 *
 * - `response.cookies.set(...)` pose la version classique (non partitionnée).
 * - `response.headers.append("Set-Cookie", ...)` ajoute la version Partitioned
 *   (uniquement en production HTTPS).
 *
 * Le navigateur ne conserve que la variante qu'il supporte, ce qui garantit la
 * compatibilité Android/desktop ET iOS dans l'iframe Pi Browser.
 */
export function setAuthCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: AuthCookieOptions = {},
): void {
  response.cookies.set(name, value, buildAuthCookieOptions(options));

  const partitioned = buildPartitionedSetCookie(name, value, options);
  if (partitioned) {
    response.headers.append("Set-Cookie", partitioned);
  }
}

/**
 * Supprime un cookie d'authentification dans TOUS les contextes.
 *
 * La suppression doit porter EXACTEMENT les mêmes attributs que la pose, sinon
 * le navigateur ignore silencieusement la suppression en contexte cross-site
 * (iframe Pi Browser). On efface donc la variante classique ET la variante
 * Partitioned.
 */
export function clearAuthCookie(
  response: NextResponse,
  name: string,
  options: Omit<AuthCookieOptions, "maxAge"> = {},
): void {
  setAuthCookie(response, name, "", { ...options, maxAge: 0 });
}
