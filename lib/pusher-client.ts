import PusherClient from "pusher-js";

// Singleton pattern to avoid multiple connections
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = (): PusherClient => {
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
