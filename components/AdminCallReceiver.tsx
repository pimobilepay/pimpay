"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  X,
  Shield,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { getPusherClient, VOIP_CHANNEL, VOIP_EVENTS } from "@/lib/pusher-client";
import type { PresenceChannel } from "pusher-js";

export type CallState = "idle" | "incoming" | "connected" | "ended";

interface IncomingCall {
  callerId: string;
  callerName?: string;
  offer: RTCSessionDescriptionInit;
  timestamp: number;
}

interface AdminCallReceiverProps {
  adminId?: string;
  onCallStateChange?: (state: CallState, callerId?: string) => void;
}

// ICE servers configuration
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Pulsing rings animation component
function PulsingRings({ isActive, color = "blue" }: { isActive: boolean; color?: "blue" | "amber" | "emerald" }) {
  const colorClass = color === "amber" ? "border-amber-500/40" : color === "emerald" ? "border-emerald-500/40" : "border-blue-500/40";
  
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {isActive && (
        <>
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className={`absolute rounded-full border-2 ${colorClass}`}
              initial={{ width: 80, height: 80, opacity: 0.6 }}
              animate={{
                width: [80, 140 + ring * 30],
                height: [80, 140 + ring * 30],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: ring * 0.4,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function AdminCallReceiver({
  adminId = "admin_support",
  onCallStateChange,
}: AdminCallReceiverProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<PresenceChannel | null>(null);

  // Format call duration
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [callDuration]);

  // Update call state
  const updateCallState = useCallback((newState: CallState, callerId?: string) => {
    setCallState(newState);
    onCallStateChange?.(newState, callerId);
  }, [onCallStateChange]);

  // Send signaling event
  const sendSignalingEvent = useCallback(async (event: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/voip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          data: { ...data, fromUserId: adminId },
        }),
      });
      if (!response.ok) throw new Error("Failed to send signaling event");
    } catch (error) {
      console.error("[AdminWebRTC] Signaling error:", error);
      setErrorMessage("Erreur de signalisation");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }, [adminId]);

  // Start timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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
      console.error("[AdminWebRTC] Media error:", error);
      setErrorMessage("Impossible d'acceder au microphone");
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((callerId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingEvent(VOIP_EVENTS.ICE_CANDIDATE, {
          candidate: event.candidate.toJSON(),
          targetUserId: callerId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[AdminWebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        updateCallState("connected", callerId);
        startTimer();
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log("[AdminWebRTC] Remote track received");
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignalingEvent, updateCallState, startTimer]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      const stream = await getLocalStream();
      const pc = createPeerConnection(incomingCall.callerId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignalingEvent(VOIP_EVENTS.CALL_ANSWER, {
        answer: answer,
        targetUserId: incomingCall.callerId,
      });

      updateCallState("connected", incomingCall.callerId);
      startTimer();
    } catch (error) {
      console.error("[AdminWebRTC] Accept call error:", error);
      setErrorMessage("Impossible d'accepter l'appel");
      updateCallState("idle");
    }
  }, [incomingCall, getLocalStream, createPeerConnection, sendSignalingEvent, updateCallState, startTimer]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      sendSignalingEvent(VOIP_EVENTS.CALL_REJECTED, {
        targetUserId: incomingCall.callerId,
      });
    }
    setIncomingCall(null);
    pendingCandidatesRef.current = [];
    updateCallState("idle");
  }, [incomingCall, sendSignalingEvent, updateCallState]);

  // End call
  const endCall = useCallback(() => {
    if (incomingCall) {
      sendSignalingEvent(VOIP_EVENTS.CALL_ENDED, {
        targetUserId: incomingCall.callerId,
      });
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
    setIncomingCall(null);
    pendingCandidatesRef.current = [];
    updateCallState("idle");
    setCallDuration(0);
    setIsMinimized(false);
  }, [incomingCall, sendSignalingEvent, stopTimer, updateCallState]);

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

  // Listen for incoming calls
  useEffect(() => {
    const pusher = getPusherClient();
    (pusher as any).config.authEndpoint = "/api/pusher/auth";

    const channel = pusher.subscribe(VOIP_CHANNEL) as PresenceChannel;
    channelRef.current = channel;

    // Handle incoming call offer
    channel.bind(
      VOIP_EVENTS.CALL_OFFER,
      (data: { offer: RTCSessionDescriptionInit; fromUserId: string; targetUserId?: string; timestamp: number }) => {
        // Only accept calls targeting "elara_support" or general admin
        if (data.fromUserId === adminId) return;
        if (data.targetUserId && data.targetUserId !== "elara_support" && data.targetUserId !== adminId) return;
        if (callState !== "idle") return; // Already in a call

        console.log("[AdminWebRTC] Incoming call from:", data.fromUserId);
        setIncomingCall({
          callerId: data.fromUserId,
          offer: data.offer,
          timestamp: data.timestamp,
        });
        updateCallState("incoming", data.fromUserId);
      }
    );

    // Handle ICE candidates
    channel.bind(
      VOIP_EVENTS.ICE_CANDIDATE,
      async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
        if (data.fromUserId === adminId) return;

        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error("[AdminWebRTC] Error adding ICE candidate:", error);
          }
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    );

    // Handle call ended by caller
    channel.bind(
      VOIP_EVENTS.CALL_ENDED,
      (data: { fromUserId: string }) => {
        if (data.fromUserId === adminId) return;
        if (incomingCall && data.fromUserId === incomingCall.callerId) {
          endCall();
        }
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(VOIP_CHANNEL);
    };
  }, [adminId, callState, incomingCall, updateCallState, endCall]);

  // Don't render anything if idle
  if (callState === "idle") return null;

  // Minimized view for connected call
  if (isMinimized && callState === "connected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 right-4 z-[100] bg-emerald-600 rounded-2xl p-3 shadow-xl shadow-emerald-500/30 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-200 uppercase">Appel en cours</p>
            <p className="text-sm font-black text-white font-mono">{formattedDuration}</p>
          </div>
          <Maximize2 size={16} className="text-white/60 ml-2" />
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-[#020617]/95 backdrop-blur-xl"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-6 right-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
              Mode Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            {callState === "connected" && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
              >
                <Minimize2 size={18} className="text-white/70" />
              </button>
            )}
            <button
              onClick={endCall}
              className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
            >
              <X size={18} className="text-white/70" />
            </button>
          </div>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl"
            >
              <p className="text-sm text-red-400">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-24 text-center"
        >
          <h2 className="text-lg font-black text-white tracking-tight">
            {callState === "incoming" ? "Appel Entrant" : "Appel en Cours"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">
            {callState === "incoming" ? "Un utilisateur vous appelle" : "Connecte"}
          </p>
        </motion.div>

        {/* Center - Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <PulsingRings
              isActive={callState === "incoming" || callState === "connected"}
              color={callState === "incoming" ? "amber" : "emerald"}
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-2xl"
            >
              <User size={44} className="text-white" />

              <motion.div
                animate={{ scale: callState === "connected" ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1, repeat: callState === "connected" ? Infinity : 0 }}
                className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-[#020617] ${
                  callState === "connected" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              >
                {callState === "incoming" ? (
                  <PhoneIncoming size={14} className="text-white animate-pulse" />
                ) : (
                  <Phone size={14} className="text-white" />
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* Caller ID */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Appelant</p>
            <p className="text-sm font-black text-white">
              {incomingCall?.callerId?.replace("user_", "Utilisateur #").substring(0, 20) || "Inconnu"}
            </p>
          </motion.div>

          {/* Call Timer */}
          {callState === "connected" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-3xl font-black text-white tracking-wider font-mono">
                {formattedDuration}
              </span>
            </motion.div>
          )}

          {/* Connection quality */}
          {callState === "connected" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20"
            >
              <div className="flex items-center gap-0.5">
                <div className="w-1 h-2 bg-emerald-500 rounded-full" />
                <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider ml-1">
                Excellente
              </span>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-16 px-6 w-full max-w-sm"
        >
          {callState === "incoming" ? (
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-all"
                >
                  <PhoneOff size={28} className="text-white" />
                </button>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Refuser
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 active:scale-90 transition-all"
                >
                  <Phone size={28} className="text-white" />
                </motion.button>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Decrocher
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={toggleMute}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    isMuted
                      ? "bg-red-500/20 border-2 border-red-500/50"
                      : "bg-white/10 border border-white/10"
                  }`}
                >
                  {isMuted ? (
                    <MicOff size={24} className="text-red-400" />
                  ) : (
                    <Mic size={24} className="text-white" />
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-all"
                >
                  <PhoneOff size={32} className="text-white" />
                </button>

                <button
                  onClick={toggleSpeaker}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    !isSpeakerOn
                      ? "bg-amber-500/20 border-2 border-amber-500/50"
                      : "bg-white/10 border border-white/10"
                  }`}
                >
                  {isSpeakerOn ? (
                    <Volume2 size={24} className="text-white" />
                  ) : (
                    <VolumeX size={24} className="text-amber-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3">
                <span className="w-16 text-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {isMuted ? "Muet" : "Micro"}
                </span>
                <span className="w-20 text-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Fin
                </span>
                <span className="w-16 text-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {isSpeakerOn ? "HP On" : "HP Off"}
                </span>
              </div>
            </>
          )}

          {/* Security badge */}
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <Shield size={12} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Appel Chiffre E2E - WebRTC
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
