"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { getPusherClient, VOIP_CHANNEL, VOIP_EVENTS } from "@/lib/pusher-client";
import type { Channel, PresenceChannel } from "pusher-js";

export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";

interface UseWebRTCOptions {
  userId: string;
  onCallStateChange?: (state: CallState) => void;
  onError?: (error: string) => void;
}

interface WebRTCHook {
  callState: CallState;
  callDuration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  remoteUserId: string | null;
  initiateCall: (targetUserId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  cleanup: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC({
  userId,
  onCallStateChange,
  onError,
}: UseWebRTCOptions): WebRTCHook {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);

  // Refs for WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<Channel | PresenceChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // FIX: Keep mutable refs for values used inside stable callbacks
  // This breaks stale-closure issues without re-creating callbacks on every state change.
  const remoteUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const isSpeakerOnRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => { remoteUserIdRef.current = remoteUserId; }, [remoteUserId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { isSpeakerOnRef.current = isSpeakerOn; }, [isSpeakerOn]);

  const updateCallState = useCallback(
    (newState: CallState) => {
      callStateRef.current = newState;
      setCallState(newState);
      onCallStateChange?.(newState);
    },
    [onCallStateChange]
  );

  const sendSignalingEvent = useCallback(
    async (event: string, data: Record<string, unknown>) => {
      try {
        const response = await fetch("/api/voip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event,
            data: { ...data, fromUserId: userId },
          }),
        });
        if (!response.ok) throw new Error("Failed to send signaling event");
      } catch (error) {
        console.error("[WebRTC] Signaling error:", error);
        onError?.("Erreur de signalisation");
      }
    },
    [userId, onError]
  );

  // Helper: send WebRTC error log to admin system logs
  const sendWebRTCErrorLog = useCallback(
    async (action: string, error: unknown, context?: Record<string, unknown>) => {
      try {
        const nav = typeof navigator !== "undefined" ? navigator : null;
        await fetch("/api/voip/log-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            userId,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorStack: error instanceof Error ? error.stack?.substring(0, 1000) : null,
            userAgent: nav?.userAgent || null,
            platform: nav?.platform || null,
            timestamp: new Date().toISOString(),
            ...context,
          }),
        });
      } catch {
        // Silent — don't throw if logging fails
      }
    },
    [userId]
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // FIX: endCall reads remoteUserId from ref — no stale closure, no dep on state
  const endCall = useCallback(() => {
    const currentRemoteId = remoteUserIdRef.current;
    if (currentRemoteId) {
      sendSignalingEvent(VOIP_EVENTS.CALL_ENDED, { targetUserId: currentRemoteId });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    stopTimer();
    remoteUserIdRef.current = null;
    setRemoteUserId(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    updateCallState("idle");
    setCallDuration(0);
  }, [sendSignalingEvent, stopTimer, updateCallState]);

  // FIX: createPeerConnection reads remoteUserId from ref
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingEvent(VOIP_EVENTS.ICE_CANDIDATE, {
          candidate: event.candidate.toJSON(),
          targetUserId: remoteUserIdRef.current,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        updateCallState("connected");
        startTimer();
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received");
      remoteStreamRef.current = event.streams[0];
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignalingEvent, updateCallState, startTimer, endCall]);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("[WebRTC] Media error:", error);
      onError?.("Impossible d'accéder au microphone");
      throw error;
    }
  }, [onError]);

  const initiateCall = useCallback(
    async (targetUserId: string) => {
      try {
        remoteUserIdRef.current = targetUserId;
        setRemoteUserId(targetUserId);
        updateCallState("calling");

        const stream = await getLocalStream();
        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignalingEvent(VOIP_EVENTS.CALL_OFFER, {
          offer,
          targetUserId,
        });
      } catch (error) {
        console.error("[WebRTC] Call initiation error:", error);
        updateCallState("idle");
        onError?.("Impossible d'initier l'appel");

        // Send detailed log to admin panel
        await sendWebRTCErrorLog("CALL_INITIATION_FAILED", error, {
          targetUserId,
          hasMicPermission: await navigator.permissions
            ?.query({ name: "microphone" as PermissionName })
            .then((r) => r.state)
            .catch(() => "unknown"),
        });
      }
    },
    [getLocalStream, createPeerConnection, sendSignalingEvent, sendWebRTCErrorLog, updateCallState, onError]
  );

  const acceptCall = useCallback(async () => {
    try {
      if (!pendingOfferRef.current) throw new Error("No pending offer");

      const stream = await getLocalStream();
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignalingEvent(VOIP_EVENTS.CALL_ANSWER, {
        answer,
        targetUserId: remoteUserIdRef.current,
      });

      updateCallState("connected");
      startTimer();
    } catch (error) {
      console.error("[WebRTC] Accept call error:", error);
      onError?.("Impossible d'accepter l'appel");
      updateCallState("idle");
    }
  }, [getLocalStream, createPeerConnection, sendSignalingEvent, updateCallState, startTimer, onError]);

  // FIX: rejectCall reads remoteUserId from ref
  const rejectCall = useCallback(() => {
    sendSignalingEvent(VOIP_EVENTS.CALL_REJECTED, {
      targetUserId: remoteUserIdRef.current,
    });
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    remoteUserIdRef.current = null;
    setRemoteUserId(null);
    updateCallState("idle");
  }, [sendSignalingEvent, updateCallState]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // FIX: toggleSpeaker reads isSpeakerOn from ref — no stale value
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      const nextSpeakerOn = !isSpeakerOnRef.current;
      remoteAudioRef.current.muted = !nextSpeakerOn;
      isSpeakerOnRef.current = nextSpeakerOn;
      setIsSpeakerOn(nextSpeakerOn);
    }
  }, []);

  const cleanup = useCallback(() => {
    endCall();
    if (channelRef.current) {
      channelRef.current.unbind_all();
      getPusherClient().unsubscribe(VOIP_CHANNEL);
      channelRef.current = null;
    }
  }, [endCall]);

  // FIX: Pusher listeners are set up ONCE on mount (userId is stable).
  // remoteUserId is read from ref inside handlers — no dependency on remoteUserId state.
  // Previously, putting remoteUserId in deps caused the channel to re-subscribe mid-call,
  // dropping signaling events and breaking the WebRTC handshake between two devices.
  useEffect(() => {
    const pusher = getPusherClient();
    pusher.config.authEndpoint = "/api/pusher/auth";

    const channel = pusher.subscribe(VOIP_CHANNEL) as PresenceChannel;
    channelRef.current = channel;

    channel.bind(
      VOIP_EVENTS.CALL_OFFER,
      async (data: {
        offer: RTCSessionDescriptionInit;
        fromUserId: string;
        targetUserId?: string;
      }) => {
        if (data.fromUserId === userId) return;
        if (data.targetUserId && data.targetUserId !== userId) return;

        console.log("[WebRTC] Incoming call from:", data.fromUserId);
        pendingOfferRef.current = data.offer;
        remoteUserIdRef.current = data.fromUserId;
        setRemoteUserId(data.fromUserId);
        updateCallState("incoming");
      }
    );

    channel.bind(
      VOIP_EVENTS.CALL_ANSWER,
      async (data: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
        if (data.fromUserId === userId) return;
        if (!peerConnectionRef.current) return;

        console.log("[WebRTC] Received answer from:", data.fromUserId);
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
        } catch (error) {
          console.error("[WebRTC] Error setting answer:", error);
        }
      }
    );

    channel.bind(
      VOIP_EVENTS.ICE_CANDIDATE,
      async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
        if (data.fromUserId === userId) return;

        console.log("[WebRTC] Received ICE candidate");
        if (peerConnectionRef.current?.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error("[WebRTC] Error adding ICE candidate:", error);
          }
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    );

    channel.bind(VOIP_EVENTS.CALL_ENDED, (data: { fromUserId: string }) => {
      if (data.fromUserId === userId) return;
      // FIX: compare against ref, not stale state
      if (data.fromUserId === remoteUserIdRef.current) {
        endCall();
      }
    });

    channel.bind(VOIP_EVENTS.CALL_REJECTED, (data: { fromUserId: string }) => {
      if (data.fromUserId === userId) return;
      if (data.fromUserId === remoteUserIdRef.current) {
        endCall();
        onError?.("L'appel a été refusé");
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(VOIP_CHANNEL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // intentionally only userId — all other values accessed via refs

  return {
    callState,
    callDuration,
    isMuted,
    isSpeakerOn,
    remoteUserId,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    cleanup,
  };
}
