"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Loader2,
  Smartphone, Building2, Globe, Fingerprint,
  CheckCircle2, Zap, Activity
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import "flag-icons/css/flag-icons.min.css";

export default function SummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const rawData = searchParams.get("data");
    if (rawData) {
      try {
        setData(JSON.parse(atob(rawData)));
      } catch {
        router.push("/withdraw");
      }
    }
  }, [searchParams, router]);

  const confirmCashout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/transaction/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push("/withdraw/success");
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Echec du retrait");
        router.push("/withdraw/failed");
      }
    } catch {
      toast.error("Erreur de connexion");
      setLoading(false);
    }
  };

  if (!data) return null;

  const isMobile = data.method === "mobile";

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <Link href="/withdraw" className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tighter">Confirmation</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">Verification finale</p>
        </div>
        <div className="p-3 opacity-0 pointer-events-none">
          <ArrowLeft size={20} />
        </div>
      </header>

      <main className="px-6 pt-8 pb-32 space-y-6 max-w-md mx-auto">
        {/* Method Badge */}
        <div className="flex justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
            isMobile
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
          }`}>
            {isMobile ? <Smartphone size={14} /> : <Building2 size={14} />}
            {isMobile ? "Retrait Mobile" : "Virement Bancaire"}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck size={100} />
          </div>

          {/* Country */}
          {data.countryCode && (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className={`fi fi-${data.countryCode.toLowerCase()} rounded-sm text-lg`} />
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pays</p>
                <p className="text-xs font-black text-white uppercase">{data.country}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="flex justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Montant</span>
            <span className="text-xl font-black text-white">{data.amount} {data.currency === "PI" ? "\u03c0" : data.currency || "PI"}</span>
          </div>

          {/* Conversion */}
          <div className="flex justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversion</span>
            <span className="text-xl font-black text-blue-400">
              {typeof data.fiatAmount === "number"
                ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.fiatAmount)
                : data.fiatAmount} {data.currency}
            </span>
          </div>

          {/* Method */}
          <div className="flex justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Methode</span>
            <span className="text-sm font-black text-white uppercase">{isMobile ? "Mobile Money" : "Virement"}</span>
          </div>

          {/* Beneficiary */}
          <div className="p-4 bg-white/5 rounded-2xl space-y-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Beneficiaire</span>
            {isMobile ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400">Operateur</span>
                  <span className="text-xs font-black text-white">{data.details?.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400">Telephone</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{data.details?.phone}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.details?.bankName && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Banque</span>
                    <span className="text-xs font-black text-white">{data.details.bankName}</span>
                  </div>
                )}
                {data.details?.accountName && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Titulaire</span>
                    <span className="text-xs font-bold text-slate-300">{data.details.accountName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400">IBAN / Compte</span>
                  <span className="text-xs font-mono font-bold text-slate-300 break-all max-w-[180px] text-right">
                    {data.details?.accountNumber || data.details?.iban}
                  </span>
                </div>
                {data.details?.swift && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">SWIFT</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{data.details.swift}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Biometric */}
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
              <Fingerprint size={28} />
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signature biometrique requise</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={confirmCashout}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Traitement en cours...</span>
            </>
          ) : (
            <>
              <Zap size={20} fill="currentColor" />
              <span>{"Confirmer l'envoi"}</span>
            </>
          )}
        </button>
      </main>

      {/* Footer */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">PimPay Withdraw Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
