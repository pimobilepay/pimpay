"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
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
  PhoneIncoming,
  Shield,
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";

export type { CallState } from "@/hooks/useWebRTC";

interface VoipCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  targetUserId?: string;
  onCallStateChange?: (state: string) => void;
}

// Pulsing rings animation component
function PulsingRings({ isActive, color = "blue" }: { isActive: boolean; color?: "blue" | "amber" }) {
  const colorClass = color === "amber" ? "border-amber-500/40" : "border-blue-500/40";
  
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {isActive && (
        <>
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className={`absolute rounded-full border-2 ${colorClass}`}
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
  userId,
  targetUserId = "elara_support",
  onCallStateChange,
}: VoipCallOverlayProps) {
  // Generate stable user ID on mount
  const [stableUserId] = useState(() => userId || `user_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    callState,
    callDuration,
    isMuted,
    isSpeakerOn,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    cleanup,
  } = useWebRTC({
    userId: stableUserId,
    onCallStateChange: (state) => {
      onCallStateChange?.(state);
    },
    onError: (error) => {
      setErrorMessage(error);
      setTimeout(() => setErrorMessage(null), 3000);
    },
  });

  // Format call duration as MM:SS
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [callDuration]);

  // Get status text based on call state
  const statusText = useMemo(() => {
    switch (callState) {
      case "calling":
        return "Connexion en cours...";
      case "incoming":
        return "Appel entrant...";
      case "connected":
        return "Appel en cours";
      case "ended":
        return "Appel terminé";
      default:
        return "Initialisation...";
    }
  }, [callState]);

  // Auto-initiate call when overlay opens
  useEffect(() => {
    if (isOpen && callState === "idle") {
      initiateCall(targetUserId);
    }
  }, [isOpen, callState, initiateCall, targetUserId]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen && callState !== "idle") {
      cleanup();
    }
    return () => {
      if (callState !== "idle") {
        cleanup();
      }
    };
  }, [isOpen]);

  // Handle end call and close
  const handleEndCall = useCallback(() => {
    endCall();
    setTimeout(() => {
      onClose();
    }, 300);
  }, [endCall, onClose]);

  // Handle reject and close
  const handleReject = useCallback(() => {
    rejectCall();
    onClose();
  }, [rejectCall, onClose]);

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
            onClick={handleEndCall}
            className="absolute top-12 right-6 p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform z-10"
            aria-label="Fermer l'appel"
          >
            <X size={20} className="text-white/70" />
          </motion.button>

          {/* Error message toast */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl"
              >
                <p className="text-sm text-red-400">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

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
              {statusText}
            </p>
          </motion.div>

          {/* Center section - Avatar with pulsing rings */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <PulsingRings
                isActive={callState === "calling" || callState === "connected"}
                color={callState === "incoming" ? "amber" : "blue"}
              />

              {/* Incoming call specific rings */}
              {callState === "incoming" && (
                <PulsingRings isActive={true} color="amber" />
              )}

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
                        : callState === "incoming"
                          ? "bg-blue-500"
                          : "bg-slate-600"
                  }`}
                >
                  {callState === "incoming" ? (
                    <PhoneIncoming size={14} className="text-white animate-pulse" />
                  ) : (
                    <Phone
                      size={14}
                      className={`text-white ${callState === "calling" ? "animate-pulse" : ""}`}
                    />
                  )}
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
                    {formattedDuration}
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
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </motion.div>
                  <span className="text-sm text-amber-400 font-bold uppercase tracking-wider">
                    Appel...
                  </span>
                </div>
              ) : callState === "incoming" ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <PhoneIncoming size={20} className="text-blue-400" />
                  </motion.div>
                  <span className="text-sm text-blue-400 font-bold uppercase tracking-wider">
                    Appel entrant
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
            {/* Incoming call controls */}
            {callState === "incoming" ? (
              <div className="flex items-center justify-center gap-8">
                {/* Reject Button */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleReject}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-all"
                    aria-label="Refuser l'appel"
                  >
                    <PhoneOff size={28} className="text-white" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Refuser
                  </span>
                </div>

                {/* Accept Button */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 active:scale-90 transition-all"
                    aria-label="Accepter l'appel"
                  >
                    <Phone size={28} className="text-white" />
                  </motion.button>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Accepter
                  </span>
                </div>
              </div>
            ) : (
              <>
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
                    onClick={handleEndCall}
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
                      !isSpeakerOn
                        ? "bg-amber-500/20 border-2 border-amber-500/50"
                        : "bg-white/10 border border-white/10"
                    }`}
                    aria-label={
                      isSpeakerOn
                        ? "Desactiver le haut-parleur"
                        : "Activer le haut-parleur"
                    }
                  >
                    {isSpeakerOn ? (
                      <Volume2 size={24} className="text-white" />
                    ) : (
                      <VolumeX size={24} className="text-amber-400" />
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
              </>
            )}

            {/* Encrypted call badge */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <Shield size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Appel Chiffré E2E • WebRTC
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
