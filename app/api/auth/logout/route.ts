/**
 * app/api/auth/logout/route.ts
 * [FIX V23] Proper token revocation on logout
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revokeTokenJWT } from "@/lib/jwt";
import { cookies } from "next/headers";
import { clearAuthCookie, setAuthCookie } from "@/lib/auth-cookies";

// [FIX DECONNEXION] Marqueur de déconnexion volontaire.
// Le proxy (middleware) authentifie uniquement sur la signature JWT : un cookie
// de token encore cryptographiquement valide qui aurait survécu à l'effacement
// (iframe Pi Browser / iOS où la suppression de cookie cross-site peut être
// ignorée) suffit à faire rebondir l'utilisateur vers /dashboard depuis la page
// de login. On pose donc un marqueur court, LISIBLE par le proxy, qui lui dit :
// "cette personne vient de se déconnecter, purge les cookies et laisse voir le
// login au lieu de rediriger vers le dashboard".
const LOGOUT_MARKER = "pimpay_loggedout";

export async function POST(req: Request) {
  try {
    // [FIX] La déconnexion NE DOIT JAMAIS échouer à cause de l'authentification.
    // Auparavant, si `getAuthUserId()` renvoyait null (token expiré, JTI révoqué,
    // token Pi qui ne se valide plus, table sessions purgée...), la route
    // renvoyait 401 et sortait AVANT d'effacer les cookies httpOnly. Résultat :
    // le clic sur "Déconnexion" laissait les cookies `token`/`pimpay_token` en
    // place côté serveur et l'utilisateur restait connecté ("le bouton de
    // déconnexion ne marche pas"). On récupère donc l'userId de façon best-effort
    // mais on efface TOUJOURS les cookies, que l'utilisateur soit identifiable
    // ou non.
    const userId = await getAuthUserId().catch(() => null);

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // [FIX V23] Revoke both tokens in Redis blacklist (best-effort)
    if (token) {
      await revokeTokenJWT(token, 900).catch(() => {}); // 15 min TTL
    }
    if (refreshToken) {
      await revokeTokenJWT(refreshToken, 604800).catch(() => {}); // 7 days TTL
    }

    // [FIX V23] Invalidate session in DB — uniquement si on a pu identifier
    // l'utilisateur (sinon on n'a rien à révoquer, mais on efface quand même
    // les cookies plus bas).
    if (userId) {
      await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      }).catch(() => {});

      // Log security event
      try {
        await prisma.auditLog.create({
          data: {
            adminId: userId,
            action: "LOGOUT",
            targetId: userId,
            category: "security",
            status: "SUCCESS"
          }
        });
      } catch (e) {
        console.error("Audit log error:", e);
      }
    }

    const response = NextResponse.json({ success: true, message: "Déconnecté" });

    // [FIX] Le Pi Browser charge PimPay dans une iframe cross-origin (voir
    // proxy.ts / CSP frame-ancestors). Les cookies de session sont donc poses
    // avec SameSite=None; Secure (obligatoire pour survivre dans ce contexte
    // cross-site). `response.cookies.delete(name)` genere un Set-Cookie de
    // suppression SANS ces attributs : dans un contexte cross-site, le
    // navigateur ignore silencieusement une suppression de cookie qui ne
    // porte pas SameSite=None; Secure, donc le cookie httpOnly "token" /
    // "pimpay_token" restait vivant et l'utilisateur Pi Network restait
    // connecte apres avoir clique sur Deconnexion. On reecrit chaque cookie
    // avec exactement les memes attributs qu'a la pose (voir pi-login) mais
    // avec maxAge: 0, pour que la suppression soit acceptee dans TOUS les
    // contextes (Pi Browser iframe ET navigateur classique).
    // [FIX iOS] — La suppression doit porter les mêmes attributs que la pose,
    // y compris la variante Partitioned (CHIPS), sinon le navigateur ignore
    // silencieusement la suppression en contexte cross-site (iframe Pi Browser).
    // clearAuthCookie efface les DEUX variantes (classique + Partitioned).
    for (const name of ["token", "pimpay_token", "refresh_token", "pi_session_token"]) {
      clearAuthCookie(response, name, { path: "/" });
    }
    // Le refresh_token est scopé sur /api/auth/refresh : on le supprime aussi
    // avec ce path pour qu'il soit réellement effacé.
    clearAuthCookie(response, "refresh_token", { path: "/api/auth/refresh" });

    // Marqueur de déconnexion (non httpOnly pour rester lisible partout, durée
    // courte). Le proxy le consomme sur la page de login pour éviter le rebond
    // vers /dashboard, puis le supprime.
    setAuthCookie(response, LOGOUT_MARKER, "1", { path: "/", maxAge: 60, httpOnly: false });

    return response;
  } catch (error: any) {
    console.error("LOGOUT_ERROR:", error);
    // [FIX] Même en cas d'erreur serveur inattendue, la déconnexion doit
    // aboutir : on efface les cookies de session et on renvoie un succès pour
    // que le client termine bien la déconnexion et redirige vers le login.
    const response = NextResponse.json({ success: true, message: "Déconnecté" });
    for (const name of ["token", "pimpay_token", "refresh_token", "pi_session_token"]) {
      clearAuthCookie(response, name, { path: "/" });
    }
    clearAuthCookie(response, "refresh_token", { path: "/api/auth/refresh" });
    setAuthCookie(response, LOGOUT_MARKER, "1", { path: "/", maxAge: 60, httpOnly: false });
    return response;
  }
}
