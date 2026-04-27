"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  X,
  Phone,
} from "lucide-react";

export type CallState = "idle" | "calling" | "connected";

interface VoipCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCallStateChange?: (state: CallState) => void;
}

// Hook for call timer
function useCallTimer(isConnected: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return formatTime(seconds);
}

// Pulsing rings animation component
function PulsingRings({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {isActive && (
        <>
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute rounded-full border-2 border-blue-500/40"
              initial={{ width: 96, height: 96, opacity: 0.6 }}
              animate={{
                width: [96, 160 + ring * 40],
                height: [96, 160 + ring * 40],
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

export default function VoipCallOverlay({
  isOpen,
  onClose,
  onCallStateChange,
}: VoipCallOverlayProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const callTime = useCallTimer(callState === "connected");

  // Refs for future SDK integration (Twilio, WebRTC, Agora)
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const updateCallState = useCallback(
    (newState: CallState) => {
      setCallState(newState);
      onCallStateChange?.(newState);
    },
    [onCallStateChange]
  );

  // Start call - simulate connecting
  const startCall = useCallback(async () => {
    updateCallState("calling");

    // TODO: Replace with actual VoIP SDK initialization
    // Example for WebRTC:
    // const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // localStreamRef.current = stream;
    // Initialize peer connection here

    // Simulate connection delay
    setTimeout(() => {
      updateCallState("connected");
    }, 2500);
  }, [updateCallState]);

  // End call
  const endCall = useCallback(() => {
    // TODO: Clean up VoIP SDK resources
    // if (localStreamRef.current) {
    //   localStreamRef.current.getTracks().forEach(track => track.stop());
    // }
    // if (peerConnectionRef.current) {
    //   peerConnectionRef.current.close();
    // }

    updateCallState("idle");
    setIsMuted(false);
    setIsSpeakerOn(false);
    onClose();
  }, [updateCallState, onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);

    // TODO: Mute local audio track
    // if (localStreamRef.current) {
    //   localStreamRef.current.getAudioTracks().forEach(track => {
    //     track.enabled = isMuted;
    //   });
    // }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);

    // TODO: Toggle audio output device
    // This typically requires Web Audio API or platform-specific SDK methods
  }, []);

  // Auto-start call when overlay opens
  useEffect(() => {
    if (isOpen && callState === "idle") {
      startCall();
    }
  }, [isOpen, callState, startCall]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setCallState("idle");
      setIsMuted(false);
      setIsSpeakerOn(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-[#020617]/95 backdrop-blur-xl"
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={endCall}
            className="absolute top-12 right-6 p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform z-10"
            aria-label="Fermer l'appel"
          >
            <X size={20} className="text-white/70" />
          </motion.button>

          {/* Top section - Status */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pt-24 text-center"
          >
            <h2 className="text-lg font-black text-white tracking-tight">
              Support Elara
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">
              {callState === "calling" && "Connexion en cours..."}
              {callState === "connected" && "Appel en cours"}
              {callState === "idle" && "Initialisation..."}
            </p>
          </motion.div>

          {/* Center section - Avatar with pulsing rings */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <PulsingRings
                isActive={callState === "calling" || callState === "connected"}
              />

              {/* Elara Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30"
              >
                <Bot size={52} className="text-white" />

                {/* Status indicator */}
                <motion.div
                  animate={{
                    scale: callState === "connected" ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: callState === "connected" ? Infinity : 0,
                  }}
                  className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-[#020617] ${
                    callState === "connected"
                      ? "bg-emerald-500"
                      : callState === "calling"
                        ? "bg-amber-500"
                        : "bg-slate-600"
                  }`}
                >
                  <Phone
                    size={14}
                    className={`text-white ${callState === "calling" ? "animate-pulse" : ""}`}
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* Call Timer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              {callState === "connected" ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-3xl font-black text-white tracking-wider font-mono">
                    {callTime}
                  </span>
                </div>
              ) : callState === "calling" ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="w-2 h-2 rounded-full bg-amber-500 delay-100" />
                    <span className="w-2 h-2 rounded-full bg-amber-500 delay-200" />
                  </motion.div>
                  <span className="text-sm text-amber-400 font-bold uppercase tracking-wider">
                    Appel...
                  </span>
                </div>
              ) : null}
            </motion.div>

            {/* Connection quality indicator */}
            {callState === "connected" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20"
              >
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-2 bg-emerald-500 rounded-full" />
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <div className="w-1 h-3 bg-emerald-400/50 rounded-full" />
                </div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider ml-1">
                  Excellente
                </span>
              </motion.div>
            )}
          </div>

          {/* Bottom section - Controls */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pb-16 px-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-center gap-6">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                disabled={callState !== "connected"}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMuted
                    ? "bg-red-500/20 border-2 border-red-500/50"
                    : "bg-white/10 border border-white/10"
                }`}
                aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? (
                  <MicOff size={24} className="text-red-400" />
                ) : (
                  <Mic size={24} className="text-white" />
                )}
              </button>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-all"
                aria-label="Terminer l'appel"
              >
                <PhoneOff size={32} className="text-white" />
              </button>

              {/* Speaker Button */}
              <button
                onClick={toggleSpeaker}
                disabled={callState !== "connected"}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSpeakerOn
                    ? "bg-blue-500/20 border-2 border-blue-500/50"
                    : "bg-white/10 border border-white/10"
                }`}
                aria-label={
                  isSpeakerOn
                    ? "Desactiver le haut-parleur"
                    : "Activer le haut-parleur"
                }
              >
                {isSpeakerOn ? (
                  <Volume2 size={24} className="text-blue-400" />
                ) : (
                  <VolumeX size={24} className="text-white" />
                )}
              </button>
            </div>

            {/* Control labels */}
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

            {/* Encrypted call badge */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Appel Chiffre E2E
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
