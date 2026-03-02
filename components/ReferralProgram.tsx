"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  Gift,
  Share2,
  UserPlus,
  X,
  Loader2,
  ChevronRight,
  Sparkles,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

interface Referral {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  createdAt: string;
}

interface ReferralData {
  referralCode: string;
  referrals: Referral[];
  totalReferrals: number;
  rewardPerReferral: number;
  totalRewards: number;
  hasBeenReferred: boolean;
}

export function ReferralProgram({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<"share" | "filleuls" | "apply">("share");

  useEffect(() => {
    fetchReferralData();
  }, []);

  async function fetchReferralData() {
    try {
      const res = await fetch("/api/referral", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyCode() {
    if (!applyCode.trim()) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: applyCode.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Parrainage applique avec succes !");
        setApplyCode("");
        fetchReferralData();
      } else {
        toast.error(json.error || "Erreur");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setIsApplying(false);
    }
  }

  function handleCopy() {
    if (!data?.referralCode) return;
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Lien copie !");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleCopyCode() {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    toast.success("Code copie !");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleShare() {
    if (!data?.referralCode) return;
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${data.referralCode}`;
    const text = `Rejoins PimPay et gagne 0.0000032 PI de bonus ! Utilise mon lien : ${link}`;
    if (navigator.share) {
      navigator.share({ title: "PimPay - Programme de Parrainage", text, url: link }).catch(() => null);
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Lien copie !");
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-slate-950 rounded-t-[32px] sm:rounded-[32px] p-8 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 rounded-t-[32px] sm:rounded-[32px] border border-white/10 shadow-2xl no-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  Programme de Parrainage
                </h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Invitez et gagnez
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-blue-400">
                {data?.totalReferrals || 0}
              </p>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                Filleuls
              </p>
            </div>
            <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-emerald-400">
                {data?.totalRewards?.toFixed(2) || "0.00"}
              </p>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                PI Gagnes
              </p>
            </div>
            <div className="bg-orange-600/10 border border-orange-500/20 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-orange-400">
                {data?.rewardPerReferral || 0.0000064}
              </p>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                PI/Invite
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 mb-4">
            {[
              { key: "share" as const, label: "Partager", icon: Share2 },
              { key: "filleuls" as const, label: "Filleuls", icon: Users },
              { key: "apply" as const, label: "Code", icon: UserPlus },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Share Tab */}
          {activeTab === "share" && (
            <div className="space-y-4">
              {/* Reward Explanation */}
              <div className="bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-slate-900/50 rounded-[24px] p-5 border border-blue-500/10">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles size={18} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    Comment ca marche
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { step: "01", text: "Partagez votre lien unique avec vos amis" },
                    { step: "02", text: "Votre ami s'inscrit via votre lien" },
                    { step: "03", text: "Vous recevez 0.0000064 PI et votre ami 0.0000032 PI" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.step}
                      </span>
                      <p className="text-[11px] font-bold text-slate-300">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral Code */}
              <div className="bg-slate-900/60 rounded-[24px] p-5 border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
                  Votre code de parrainage
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-800/80 rounded-xl px-4 py-3 border border-white/5">
                    <p className="text-sm font-mono font-black text-blue-400 tracking-wider">
                      {data?.referralCode || "---"}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 bg-slate-900/60 border border-white/5 rounded-2xl py-4 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
                >
                  <Link2 size={16} className="text-blue-400" />
                  Copier le lien
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-blue-600 rounded-2xl py-4 text-[10px] font-black uppercase tracking-wider text-white active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Share2 size={16} />
                  Partager
                </button>
              </div>
            </div>
          )}

          {/* Filleuls Tab */}
          {activeTab === "filleuls" && (
            <div className="space-y-3">
              {data?.referrals && data.referrals.length > 0 ? (
                data.referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 bg-slate-900/60 border border-white/5 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black">
                        {(referral.name || referral.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {referral.name || referral.username || "Utilisateur"}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold">
                          @{referral.username || "---"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-400">
                        +0.5 PI
                      </p>
                      <p className="text-[8px] text-slate-600 font-bold">
                        {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 rounded-[24px] border border-dashed border-white/10">
                  <Users size={32} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Aucun filleul pour le moment
                  </p>
                  <p className="text-[9px] text-slate-700 mt-1 font-bold">
                    Partagez votre lien pour commencer
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Apply Code Tab */}
          {activeTab === "apply" && (
            <div className="space-y-4">
              {data?.hasBeenReferred ? (
                <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[24px] p-6 text-center">
                  <Check size={32} className="mx-auto text-emerald-400 mb-3" />
                  <p className="text-xs font-black uppercase text-emerald-400">
                    Deja parraine
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold">
                    Vous avez deja un parrain actif
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900/60 rounded-[24px] p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <Gift size={18} className="text-orange-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Entrez un code de parrainage
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mb-4">
                      Si un ami vous a invite, entrez son code pour recevoir un bonus de 0.0000032 PI.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Code de parrainage..."
                        value={applyCode}
                        onChange={(e) => setApplyCode(e.target.value)}
                        className="flex-1 bg-slate-800/80 rounded-xl px-4 py-3 border border-white/5 text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                      />
                      <button
                        onClick={handleApplyCode}
                        disabled={isApplying || !applyCode.trim()}
                        className="px-5 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white disabled:opacity-40 active:scale-95 transition-all flex items-center gap-2"
                      >
                        {isApplying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        Appliquer
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
