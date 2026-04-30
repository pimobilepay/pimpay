import Pusher from "pusher";

function createPusherServer(): Pusher {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Variables d'environnement Pusher manquantes: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER sont requis"
    );
  }

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

// Server-side Pusher instance for triggering events
export const pusherServer = createPusherServer();

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
