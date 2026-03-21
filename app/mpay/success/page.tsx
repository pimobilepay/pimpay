"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Home, Share2, Copy, Check, ExternalLink, ShieldCheck, Zap, Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const amount = params.get("amount") || "0";
  const to = params.get("to") || "Utilisateur PimPay";
  const txid = params.get("txid") || "TX-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  const isExternal = params.get("external") === "true";
  const blockchainHash = params.get("hash") || "";
  const withdrawStatus = params.get("status") || ""; // QUEUED, PROCESSING, BROADCASTED
  const isQueued = withdrawStatus === "QUEUED" || (isExternal && !blockchainHash);
  const date = new Date().toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  
  const explorerUrl = blockchainHash 
    ? `https://blockexplorer.minepi.com/tx/${blockchainHash}` 
    : `https://blockexplorer.minepi.com/`;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const copyTxid = () => {
    navigator.clipboard.writeText(txid);
    setCopied(true);
    toast.success("ID copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      {/* Ambient success glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[70%] h-[40%] blur-[150px] rounded-full animate-pulse ${isExternal ? 'bg-amber-500/8' : 'bg-emerald-500/8'}`} />
      </div>

      {/* Confetti-like particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              backgroundColor: ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#06b6d4", "#10b981"][i],
              left: `${15 + i * 14}%`,
              top: `${10 + (i % 3) * 8}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: `${1500 + i * 300}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-16 pb-12">
        {/* Success Animation */}
        <div className="flex flex-col items-center mb-10 animate-in zoom-in-50 duration-700">
          <div className="relative mb-6">
            <div className={`absolute -inset-6 rounded-full blur-2xl animate-pulse ${isExternal ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center">
              {/* Animated ring */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                <circle
                  cx="48" cy="48" r="44"
                  fill="none"
                  stroke={isExternal ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)"}
                  strokeWidth="3"
                />
                <circle
                  cx="48" cy="48" r="44"
                  fill="none"
                  stroke={isExternal ? "#f59e0b" : "#10b981"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="276"
                  strokeDashoffset="0"
                  className="animate-[spin_3s_linear_infinite]"
                  style={{ transformOrigin: "center" }}
                />
              </svg>
              {isExternal ? (
                <Globe size={48} className="text-amber-500 relative z-10" />
              ) : (
                <CheckCircle2 size={48} className="text-emerald-500 relative z-10" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
            {isExternal ? (isQueued ? 'En Cours' : 'Envoye') : 'Confirme'}
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] text-center">
            {isExternal 
              ? (isQueued ? 'Retrait en cours de traitement' : 'Transaction blockchain confirmee') 
              : 'Transaction validee avec succes'}
          </p>
        </div>

        {/* Receipt Card */}
        {showContent && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 mb-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                <Zap size={80} />
              </div>

              {/* Amount */}
              <div className="text-center border-b border-dashed border-white/10 pb-6 mb-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant envoye</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black tracking-tighter">{amount}</span>
                  <span className="text-xl font-black text-blue-500">Pi</span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destinataire</span>
                  <span className="text-xs font-black uppercase">{to}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</span>
                  <span className="text-xs font-bold text-slate-300">{date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut</span>
                  <span className={`text-[8px] font-black px-3 py-1 rounded-full border ${
                    isExternal 
                      ? (isQueued ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20')
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {isExternal 
                      ? (isQueued ? 'EN COURS DE TRAITEMENT' : 'BLOCKCHAIN CONFIRME') 
                      : 'CONFIRME'}
                  </span>
                </div>
                {isExternal && isQueued && (
                  <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-[10px] text-amber-400/80 leading-relaxed">
                      Votre retrait est en file d'attente. Le transfert blockchain sera effectue automatiquement sous 1-5 minutes.
                    </p>
                  </div>
                )}
                {isExternal && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</span>
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Globe size={12} /> Pi Wallet Externe
                    </span>
                  </div>
                )}
                <div className="pt-4 border-t border-dashed border-white/10 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">ID Transaction</span>
                    <button
                      onClick={copyTxid}
                      className="w-full flex items-center justify-between gap-2 bg-white/5 px-4 py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all"
                    >
                      <span className="text-[10px] font-mono text-slate-400 truncate">{txid}</span>
                      {copied ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="text-slate-500 shrink-0" />}
                    </button>
                  </div>
                  {blockchainHash && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                        <Globe size={10} /> Hash Blockchain
                      </span>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between gap-2 bg-amber-500/5 px-4 py-3 rounded-xl border border-amber-500/20 hover:bg-amber-500/10 transition-all"
                      >
                        <span className="text-[9px] font-mono text-amber-400/80 truncate">{blockchainHash.slice(0, 16)}...{blockchainHash.slice(-8)}</span>
                        <ExternalLink size={14} className="text-amber-500 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-all active:scale-95">
                <Share2 size={14} className="text-blue-500" />
                Partager
              </button>
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-all active:scale-95"
              >
                <ExternalLink size={14} className={isExternal ? "text-amber-500" : "text-blue-500"} />
                {isExternal ? 'Pi Explorer' : 'Explorateur'}
              </a>
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => router.push("/mpay")}
              className="w-full bg-white text-[#020617] p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-100 active:scale-95 transition-all mb-4"
            >
              Retour a mPay
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Home size={16} /> Dashboard
            </button>

            <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
              <ShieldCheck size={12} className="text-emerald-500" />
              <p className="text-[8px] font-black uppercase tracking-[0.3em]">Certifie PimPay Node</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
