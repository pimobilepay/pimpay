import { NextRequest, NextResponse } from "next/server";
import { pusherServer, isPusherServerConfigured } from "@/lib/pusher-server";
import { getAuthUserId } from "@/lib/auth";
import { GUEST_COOKIE, guestCookieOptions, newGuestId, readGuestId } from "@/lib/guest-session";

// Canal partagé utilisé pour la signalisation des appels VoIP (bouton téléphone
// de la page de chat). Contrairement aux canaux "presence-user-<id>" / privés
// qui exposent des données de compte, celui-ci ne sert qu'à faire transiter des
// offres/réponses WebRTC — il peut donc être ouvert aux visiteurs non connectés
// (support client externe), sans quoi leur bouton d'appel ne fonctionne jamais.
const VOIP_CHANNEL = "presence-cache-voip";

export async function POST(request: NextRequest) {
  // [FIX] Erreur claire si Pusher n'est pas configuré, plutôt qu'un 500 opaque.
  if (!isPusherServerConfigured()) {
    return NextResponse.json(
      { error: "Service d'appel non configuré (Pusher manquant côté serveur)." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // [FIX V5] — Vérifier que le demandeur est authentifié avant d'émettre une autorisation Pusher
    const userId = await getAuthUserId();

    // [FIX] — CAUSE RACINE du bouton d'appel qui ne fonctionnait pas pour les
    // visiteurs du chat support (comptes "CLIENT EXTERNE" non connectés) :
    // cette route exigeait un `userId` authentifié pour TOUT canal, y compris
    // le canal VoIP. Les invités ne peuvent jamais se connecter, donc leur
    // abonnement au canal échouait silencieusement (401) et l'appel restait
    // bloqué sur "Connexion en cours..." indéfiniment, sans jamais recevoir
    // de réponse. On autorise désormais un identifiant invité stable
    // (cookie httpOnly déjà utilisé pour les tickets de support) UNIQUEMENT
    // pour le canal VoIP — tous les autres canaux restent strictement réservés
    // aux comptes authentifiés.
    let effectiveUserId = userId;
    let newGuestCookie: string | null = null;
    if (!effectiveUserId) {
      if (channelName !== VOIP_CHANNEL) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }
      let guestId = await readGuestId();
      if (!guestId) {
        guestId = newGuestId();
        newGuestCookie = guestId;
      }
      effectiveUserId = guestId;
    }

    // [FIX V5] — Valider que le canal demandé correspond à l'utilisateur authentifié.
    // Ex: "private-user-<userId>" ou "presence-<userId>" ne doit être accordé qu'à ce userId.
    const channelUserMatch = channelName.match(/(?:private|presence)-user-(.+)/);
    if (channelUserMatch && channelUserMatch[1] !== effectiveUserId) {
      return NextResponse.json(
        { error: "Accès au canal refusé" },
        { status: 403 }
      );
    }

    // For presence channels, we need to provide user data
    if (channelName.startsWith("presence-")) {
      const presenceData = {
        user_id: effectiveUserId,
        user_info: {
          name: userId ? "PIMOBIPAY User" : "Visiteur",
          role: userId ? "customer" : "guest",
        },
      };

      const auth = pusherServer.authorizeChannel(socketId, channelName, presenceData);
      const res = NextResponse.json(auth);
      if (newGuestCookie) {
        res.cookies.set(GUEST_COOKIE, newGuestCookie, guestCookieOptions());
      }
      return res;
    }

    // For private channels
    const auth = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  } catch (error) {
    console.error("[Pusher Auth] Error:", error);
    return NextResponse.json(
      { error: "Failed to authorize channel" },
      { status: 500 }
    );
  }
}
