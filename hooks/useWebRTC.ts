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

// ICE servers configuration with Google STUN
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

  // Update call state with callback
  const updateCallState = useCallback(
    (newState: CallState) => {
      setCallState(newState);
      onCallStateChange?.(newState);
    },
    [onCallStateChange]
  );

  // Send signaling event via API
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

        if (!response.ok) {
          throw new Error("Failed to send signaling event");
        }
      } catch (error) {
        console.error("[WebRTC] Signaling error:", error);
        onError?.("Erreur de signalisation");
      }
    },
    [userId, onError]
  );

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingEvent(VOIP_EVENTS.ICE_CANDIDATE, {
          candidate: event.candidate.toJSON(),
          targetUserId: remoteUserId,
        });
      }
    };

    // Handle connection state changes
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

    // Handle remote track
    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received");
      remoteStreamRef.current = event.streams[0];

      // Create audio element if not exists
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignalingEvent, remoteUserId, updateCallState]);

  // Get local audio stream
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

  // Start call timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initiate a call
  const initiateCall = useCallback(
    async (targetUserId: string) => {
      try {
        setRemoteUserId(targetUserId);
        updateCallState("calling");

        // Get local audio
        const stream = await getLocalStream();

        // Create peer connection
        const pc = createPeerConnection();

        // Add local tracks to connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignalingEvent(VOIP_EVENTS.CALL_OFFER, {
          offer: offer,
          targetUserId,
        });
      } catch (error) {
        console.error("[WebRTC] Call initiation error:", error);
        updateCallState("idle");
        onError?.("Impossible d'initier l'appel");
      }
    },
    [
      getLocalStream,
      createPeerConnection,
      sendSignalingEvent,
      updateCallState,
      onError,
    ]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      if (!pendingOfferRef.current) {
        throw new Error("No pending offer");
      }

      // Get local audio
      const stream = await getLocalStream();

      // Create peer connection
      const pc = createPeerConnection();

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote description (the offer)
      await pc.setRemoteDescription(
        new RTCSessionDescription(pendingOfferRef.current)
      );

      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignalingEvent(VOIP_EVENTS.CALL_ANSWER, {
        answer: answer,
        targetUserId: remoteUserId,
      });

      updateCallState("connected");
      startTimer();
    } catch (error) {
      console.error("[WebRTC] Accept call error:", error);
      onError?.("Impossible d'accepter l'appel");
      updateCallState("idle");
    }
  }, [
    getLocalStream,
    createPeerConnection,
    sendSignalingEvent,
    remoteUserId,
    updateCallState,
    startTimer,
    onError,
  ]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    sendSignalingEvent(VOIP_EVENTS.CALL_REJECTED, {
      targetUserId: remoteUserId,
    });
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteUserId(null);
    updateCallState("idle");
  }, [sendSignalingEvent, remoteUserId, updateCallState]);

  // End call
  const endCall = useCallback(() => {
    // Notify remote user
    if (remoteUserId) {
      sendSignalingEvent(VOIP_EVENTS.CALL_ENDED, {
        targetUserId: remoteUserId,
      });
    }

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clean up audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    // Reset state
    stopTimer();
    setRemoteUserId(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    updateCallState("idle");
    setCallDuration(0);
  }, [remoteUserId, sendSignalingEvent, stopTimer, updateCallState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  // Cleanup function
  const cleanup = useCallback(() => {
    endCall();
    if (channelRef.current) {
      channelRef.current.unbind_all();
      getPusherClient().unsubscribe(VOIP_CHANNEL);
      channelRef.current = null;
    }
  }, [endCall]);

  // Set up Pusher channel and listeners
  useEffect(() => {
    const pusher = getPusherClient();

    // Configure auth endpoint
    pusher.config.authEndpoint = "/api/pusher/auth";

    // Subscribe to presence channel
    const channel = pusher.subscribe(VOIP_CHANNEL) as PresenceChannel;
    channelRef.current = channel;

    // Handle incoming call offer
    channel.bind(
      VOIP_EVENTS.CALL_OFFER,
      async (data: {
        offer: RTCSessionDescriptionInit;
        fromUserId: string;
        targetUserId?: string;
      }) => {
        // Ignore if it's our own offer or not targeted at us
        if (data.fromUserId === userId) return;
        if (data.targetUserId && data.targetUserId !== userId) return;

        console.log("[WebRTC] Incoming call from:", data.fromUserId);
        pendingOfferRef.current = data.offer;
        setRemoteUserId(data.fromUserId);
        updateCallState("incoming");
      }
    );

    // Handle call answer
    channel.bind(
      VOIP_EVENTS.CALL_ANSWER,
      async (data: {
        answer: RTCSessionDescriptionInit;
        fromUserId: string;
      }) => {
        if (data.fromUserId === userId) return;
        if (!peerConnectionRef.current) return;

        console.log("[WebRTC] Received answer from:", data.fromUserId);
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          }
          pendingCandidatesRef.current = [];
        } catch (error) {
          console.error("[WebRTC] Error setting answer:", error);
        }
      }
    );

    // Handle ICE candidates
    channel.bind(
      VOIP_EVENTS.ICE_CANDIDATE,
      async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
        if (data.fromUserId === userId) return;

        console.log("[WebRTC] Received ICE candidate");
        if (
          peerConnectionRef.current &&
          peerConnectionRef.current.remoteDescription
        ) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (error) {
            console.error("[WebRTC] Error adding ICE candidate:", error);
          }
        } else {
          // Queue candidate if remote description not set yet
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    );

    // Handle call ended
    channel.bind(
      VOIP_EVENTS.CALL_ENDED,
      (data: { fromUserId: string }) => {
        if (data.fromUserId === userId) return;
        if (data.fromUserId === remoteUserId) {
          endCall();
        }
      }
    );

    // Handle call rejected
    channel.bind(
      VOIP_EVENTS.CALL_REJECTED,
      (data: { fromUserId: string }) => {
        if (data.fromUserId === userId) return;
        if (data.fromUserId === remoteUserId) {
          endCall();
          onError?.("L'appel a été refusé");
        }
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(VOIP_CHANNEL);
    };
  }, [userId, updateCallState, endCall, onError, remoteUserId]);

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
