"use client";

import { usePiAuth } from "@/context/pi-auth-context";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

export default function GlobalLoading() {
  const { authMessage, reinitialize } = usePiAuth();
  
  // On détecte si le SDK renvoie une erreur
  const isError = authMessage.toLowerCase().includes("failed") || authMessage.toLowerCase().includes("error");

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col items-center justify-center p-6">
      <div className="relative">
        {isError ? (
          <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] animate-pulse ${isError ? 'text-red-400' : 'text-blue-400'}`}>
          {isError ? "Authentication Failed" : "PIMPAY Network Syncing..."}
        </p>
        
        <p className="text-[12px] text-slate-500 font-medium text-center max-w-[250px]">
          {authMessage}
        </p>

        {isError && (
          <button
            onClick={reinitialize}
            className="mt-2 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-full transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
