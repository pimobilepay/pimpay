"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function RescuePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("En attente...");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Mode 1: Batch resolve all incomplete payments
  const handleBatchResolve = async () => {
    setLoading(true);
    setStatus("Connexion au reseau Pi...");
    setResults([]);

    try {
      const res = await fetch("/api/admin/force-cancel");
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message || "Traitement termine");
        setResults(data.details || []);
      } else {
        setStatus(`ERREUR (${res.status}): ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setStatus(`ERREUR RESEAU: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mode 2: Cancel a specific payment
  const [specificId, setSpecificId] = useState("");
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
        setStatus(data.message || "Paiement annule");
      } else {
        setStatus(`ERREUR: ${data.error?.message || JSON.stringify(data.error)}`);
      }
    } catch (err: any) {
      setStatus(`ERREUR RESEAU: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = status.includes("succes") || status.includes("termine")
    ? "#4ade80"
    : status.includes("ERREUR")
    ? "#f87171"
    : "#fff";

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Rescue</h1>
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6 p-6">

        {/* Status display */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Statut</p>
          <p className="text-sm font-bold" style={{ color: statusColor }}>{status}</p>

          {results.length > 0 && (
            <div className="mt-3 space-y-1">
              {results.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-700">
                  <code className="text-slate-400 truncate mr-2">{r.id?.slice(0, 16)}...</code>
                  <span className={`font-bold uppercase ${
                    r.action === "completed" || r.action === "cancelled" ? "text-green-400" : "text-red-400"
                  }`}>{r.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch resolve */}
        <button
          onClick={handleBatchResolve}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-black uppercase text-sm tracking-wider transition-all ${
            loading ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-amber-400 text-black active:scale-[0.98]"
          }`}
        >
          {loading ? "TRAITEMENT EN COURS..." : "DEBLOQUER TOUS LES PAIEMENTS"}
        </button>

        {/* Specific payment cancel */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annuler un paiement specifique</p>
          <input
            type="text"
            value={specificId}
            onChange={(e) => setSpecificId(e.target.value)}
            placeholder="Payment ID (ex: lEU8r9rfLhK...)"
            className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-400/50"
          />
          <button
            onClick={handleCancelSpecific}
            disabled={loading || !specificId.trim()}
            className={`w-full py-3 rounded-lg font-bold uppercase text-xs tracking-wider transition-all ${
              loading || !specificId.trim()
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-red-500/80 text-white active:scale-[0.98]"
            }`}
          >
            ANNULER CE PAIEMENT
          </button>
        </div>

        <p className="text-center text-[9px] text-slate-600 uppercase tracking-wider">
          Appelle /api/admin/force-cancel et /api/payments/incomplete
        </p>
      </div>
    </div>
  );
}
