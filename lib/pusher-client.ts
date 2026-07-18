import PusherClient from "pusher-js";

// Singleton pattern to avoid multiple connections
let pusherClientInstance: PusherClient | null = null;

// [FIX] Avant : `new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, ...)` lançait
// une exception SYNCHRONE si la clé n'était pas configurée (ex: NEXT_PUBLIC_PUSHER_KEY
// absente des variables d'environnement Vercel), ce qui cassait silencieusement tout
// le flux d'appel (bouton téléphone) sans aucun message d'erreur exploitable pour
// l'utilisateur — l'overlay restait bloqué sur "Connexion en cours..." indéfiniment.
export function isPusherConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

export const getPusherClient = (): PusherClient => {
  if (!isPusherConfigured()) {
    throw new Error(
      "PUSHER_NOT_CONFIGURED: NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER manquantes."
    );
  }
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      }
    );
  }
  return pusherClientInstance;
};

// VoIP channel name - using presence channel for real-time presence
export const VOIP_CHANNEL = "presence-cache-voip";

// VoIP event types (client-side mirror)
export const VOIP_EVENTS = {
  CALL_INITIATED: "call-initiated",
  CALL_OFFER: "call-offer",
  CALL_ANSWER: "call-answer",
  ICE_CANDIDATE: "ice-candidate",
  CALL_ENDED: "call-ended",
  CALL_REJECTED: "call-rejected",
  CALL_ACCEPTED: "call-accepted",
} as const;
