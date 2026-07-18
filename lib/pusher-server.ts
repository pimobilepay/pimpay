import Pusher from "pusher";

// [FIX] Avant : `new Pusher({...})` était instancié au NIVEAU MODULE avec `!`
// (assertion non-null) sur des variables d'environnement potentiellement absentes
// (PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER).
// Si l'une d'elles manquait, la simple IMPORTATION de ce fichier plantait — donc
// TOUTE requête vers /api/voip ou /api/pusher/auth échouait avec une erreur 500
// opaque, sans que le vrai problème (config manquante) ne soit jamais visible.
// On passe donc à une instanciation "lazy" (paresseuse) + un helper explicite
// pour vérifier la configuration AVANT de tenter quoi que ce soit.
export function isPusherServerConfigured(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

let _pusherServer: Pusher | null = null;

function buildPusherServer(): Pusher {
  if (!isPusherServerConfigured()) {
    throw new Error(
      "PUSHER_NOT_CONFIGURED: PUSHER_APP_ID / NEXT_PUBLIC_PUSHER_KEY / PUSHER_SECRET / NEXT_PUBLIC_PUSHER_CLUSTER manquantes."
    );
  }
  return new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });
}

// Proxy conservant l'API existante (`pusherServer.trigger(...)`, etc.) tout en
// différant la construction réelle jusqu'au premier appel effectif.
export const pusherServer: Pusher = new Proxy({} as Pusher, {
  get(_target, prop, receiver) {
    if (!_pusherServer) _pusherServer = buildPusherServer();
    return Reflect.get(_pusherServer, prop, receiver);
  },
});

// VoIP event types for type safety
export const VOIP_EVENTS = {
  CALL_INITIATED: "call-initiated",
  CALL_OFFER: "call-offer",
  CALL_ANSWER: "call-answer",
  ICE_CANDIDATE: "ice-candidate",
  CALL_ENDED: "call-ended",
  CALL_REJECTED: "call-rejected",
  CALL_ACCEPTED: "call-accepted",
} as const;

export type VoipEventType = (typeof VOIP_EVENTS)[keyof typeof VOIP_EVENTS];
