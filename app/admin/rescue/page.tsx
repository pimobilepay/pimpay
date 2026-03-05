"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, AlertTriangle, Loader2, Shield,
  Zap, XCircle, CheckCircle2, ChevronRight, Clock, Hash, Trash2
} from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>
  );
}

type ResultItem = {
  id: string;
  action: string;
};

export default function RescuePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("En attente d'une commande...");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [specificId, setSpecificId] = useState("");

  const statusType: "success" | "error" | "idle" =
    status.includes("succes") || status.includes("termine") || status.includes("annule")
      ? "success"
      : status.includes("ERREUR")
        ? "error"
        : "idle";

  const handleBatchResolve = async () => {
    setLoading(true);
    setStatus("Connexion au reseau Pi...");
    setResults([]);

    try {
      const res = await fetch("/api/admin/force-cancel");
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message || "Traitement termine avec succes");
        setResults(data.details || []);
        toast.success("Paiements traites avec succes");
      } else {
        setStatus(`ERREUR (${res.status}): ${data.error || JSON.stringify(data)}`);
        toast.error("Erreur lors du traitement");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setStatus(`ERREUR RESEAU: ${message}`);
      toast.error("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSpecific = async () => {
    if (!specificId.trim()) return;
    setLoading(true);
    setStatus(`Annulation de ${specificId}...`);
    setResults([]);

    try {
      const res = await fetch("/api/admin/force-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: specificId.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message || "Paiement annule avec succes");
        toast.success("Paiement annule");
        setSpecificId("");
      } else {
        setStatus(`ERREUR: ${data.error?.message || JSON.stringify(data.error)}`);
        toast.error("Echec de l'annulation");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setStatus(`ERREUR RESEAU: ${message}`);
      toast.error("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Mode Rescue</h1>
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">

        {/* WARNING BANNER */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-[1.5rem] p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">Zone Sensible</p>
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Les actions sur cette page interagissent directement avec le reseau Pi. Utilisez avec precaution. Toutes les actions sont journalisees.
            </p>
          </div>
        </div>

        {/* STATUS CARD */}
        <div>
          <SectionTitle>Statut du Systeme</SectionTitle>
          <div className={`bg-slate-900/60 border rounded-[1.5rem] p-5 ${
            statusType === "success" ? "border-emerald-500/20" :
            statusType === "error" ? "border-red-500/20" :
            "border-white/[0.06]"
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                statusType === "success" ? "bg-emerald-500/10" :
                statusType === "error" ? "bg-red-500/10" :
                "bg-blue-500/10"
              }`}>
                {loading ? (
                  <Loader2 size={18} className="text-blue-400 animate-spin" />
                ) : statusType === "success" ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : statusType === "error" ? (
                  <XCircle size={18} className="text-red-400" />
                ) : (
                  <Clock size={18} className="text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-1">Dernier statut</p>
                <p className={`text-[11px] font-bold ${
                  statusType === "success" ? "text-emerald-400" :
                  statusType === "error" ? "text-red-400" :
                  "text-white"
                }`}>
                  {status}
                </p>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-2">
                  Resultats ({results.length})
                </p>
                {results.map((r: ResultItem, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash size={10} className="text-slate-600 flex-shrink-0" />
                      <code className="text-[10px] text-slate-400 truncate font-mono">
                        {r.id?.slice(0, 20)}...
                      </code>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      r.action === "completed" || r.action === "cancelled"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {r.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BATCH RESOLVE */}
        <div>
          <SectionTitle>Deblocage Global</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Resoudre tous les paiements</p>
                <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                  Complete ou annule automatiquement tous les paiements incomplets en attente sur le reseau Pi.
                </p>
              </div>
            </div>
            <button
              onClick={handleBatchResolve}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                loading
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Debloquer tous les paiements
                </>
              )}
            </button>
          </div>
        </div>

        {/* SPECIFIC PAYMENT CANCEL */}
        <div>
          <SectionTitle>Annulation Specifique</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Annuler un paiement</p>
                <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                  Entrez l'identifiant du paiement pour l'annuler manuellement sur le reseau Pi.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={specificId}
                  onChange={(e) => setSpecificId(e.target.value)}
                  placeholder="Payment ID (ex: lEU8r9rfLhK...)"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-3.5 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 transition-colors font-mono"
                />
              </div>
              <button
                onClick={handleCancelSpecific}
                disabled={loading || !specificId.trim()}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  loading || !specificId.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-red-500/80 text-white hover:bg-red-500 shadow-lg shadow-red-500/20"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Annulation en cours...
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    Annuler ce paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* API INFO */}
        <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Shield size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-tight">Endpoints API</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Routes internes utilisees par le mode rescue</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            {[
              { method: "GET", path: "/api/admin/force-cancel", desc: "Resoudre automatiquement" },
              { method: "POST", path: "/api/admin/force-cancel", desc: "Annuler un paiement specifique" },
              { method: "GET", path: "/api/payments/incomplete", desc: "Lister les paiements incomplets" },
            ].map((endpoint, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                  endpoint.method === "GET" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-[9px] text-slate-400 font-mono flex-1 truncate">{endpoint.path}</code>
                <span className="text-[8px] text-slate-600">{endpoint.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col items-center gap-2 pt-6 opacity-20">
          <Shield size={14} />
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">PimPay Rescue Module v4.0</p>
        </div>
      </div>
    </div>
  );
}
