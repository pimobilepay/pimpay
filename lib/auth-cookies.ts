/**
 * Options de cookies d'authentification centralisées.
 *
 * [FIX iOS / Pi Browser] — L'application est chargée dans une iframe cross-origin
 * (Pi Browser). Sur iPhone (moteur WebKit / Safari), la politique stricte de
 * cookies tiers empêche le stockage des cookies `SameSite=None; Secure` classiques
 * lorsqu'ils sont posés depuis une iframe tierce. Résultat : après un login réussi,
 * aucun cookie de session n'est conservé → l'utilisateur est renvoyé en boucle vers
 * la page de connexion.
 *
 * La solution standard (iOS 16.4+, Chrome, Edge, Firefox) est CHIPS :
 * l'attribut `Partitioned`. Le cookie est alors stocké dans un "jar" partitionné
 * par le site de premier niveau, ce qui le rend acceptable en iframe cross-origin.
 *
 * En développement (localhost, HTTP), on garde `SameSite=Lax` sans `Secure` ni
 * `Partitioned` pour ne pas casser le flux local.
 */

type AuthCookieOptions = {
  /** Durée de vie en secondes. Passer 0 pour supprimer le cookie. */
  maxAge?: number;
  /** Chemin du cookie. Par défaut "/". */
  path?: string;
  /** httpOnly. Par défaut true. Certains cookies (ex: pi_session_token) sont lisibles côté client. */
  httpOnly?: boolean;
};

/**
 * Construit les options d'un cookie de session, avec support Partitioned (CHIPS)
 * en production pour fonctionner dans l'iframe du Pi Browser sur iOS.
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
    // En iframe cross-origin, SameSite doit valoir "none" pour que le cookie soit envoyé.
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path,
    // CHIPS : indispensable pour iOS/WebKit en iframe tierce. Requiert Secure,
    // donc uniquement en production (HTTPS).
    ...(isProduction ? { partitioned: true } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
