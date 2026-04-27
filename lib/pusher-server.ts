import Pusher from "pusher";

// Server-side Pusher instance for triggering events
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
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
