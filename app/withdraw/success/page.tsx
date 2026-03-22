"use client";

import { Suspense } from "react";
import {
  CheckCircle2, ArrowRight, Receipt, Wallet, Loader2,
  Share2, Lock, Copy, Smartphone, Building2, ShieldCheck,
  Clock, Activity
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref         = searchParams.get("ref") || "";
  const amount      = searchParams.get("amount") || "0";
  const currency    = searchParams.get("currency") || "PI";
  const fiatAmount  = searchParams.get("fiatAmount") || "";
  const fiatCurrency = searchParams.get("fiatCurrency") || "";
  const method      = searchParams.get("method") || "";
  const country     = searchParams.get("country") || "";
  const provider    = searchParams.get("provider") || "";
  const phone       = searchParams.get("phone") || "";
  const bankName    = searchParams.get("bankName") || "";
  const accountName = searchParams.get("accountName") || "";
  const accountNumber = searchParams.get("accountNumber") || "";

  const isMobile = method === "mobile";

  const formatAmount = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    if (currency === "PI") {
      // Affichage intelligent: plus de décimales pour petits montants
      if (n < 0.0001) {
        return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
      }
      return n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    }
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(n);
  };

  const formatFiat = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n) || !val) return null;
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const copyRef = () => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    toast.success("Référence copiée !");
  };

  const receiptParams = new URLSearchParams();
  receiptParams.set("ref", ref);
  receiptParams.set("amount", amount);
  receiptParams.set("currency", currency);
  if (fiatAmount) receiptParams.set("fiatAmount", fiatAmount);
  if (fiatCurrency) receiptParams.set("fiatCurrency", fiatCurrency);
  if (method) receiptParams.set("method", method);
  if (country) receiptParams.set("country", country);
  if (isMobile) {
    receiptParams.set("provider", provider);
    receiptParams.set("phone", phone);
  } else {
    receiptParams.set("bankName", bankName);
    receiptParams.set("accountName", accountName);
    receiptParams.set("accountNumber", accountNumber);
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Top: icon + amount */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center w-full relative z-10"
      >
        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl">
            <CheckCircle2 className="text-emerald-500" size={42} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
          Demande Recue
        </h1>
        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[3px] mb-10">
          Traitement en cours
        </p>

        {/* Amount display */}
        <div className="mb-3">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black text-white tracking-tighter">
              {formatAmount(amount)}
            </span>
            <span className="text-xl font-bold text-blue-500">{currency}</span>
          </div>
          {formatFiat(fiatAmount) && (
            <p className="text-[11px] text-blue-400/80 mt-3 font-black uppercase tracking-widest bg-blue-500/5 py-1 px-3 rounded-full border border-blue-500/10 inline-block">
              ≈ {formatFiat(fiatAmount)} {fiatCurrency}
            </p>
          )}
        </div>

        {/* Method badge */}
        {method && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest mt-4 ${
            isMobile
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
          }`}>
            {isMobile ? <Smartphone size={14} /> : <Building2 size={14} />}
            {isMobile ? "Mobile Money" : "Virement Bancaire"}
            {country ? ` — ${country}` : ""}
          </div>
        )}
      </motion.div>

      {/* Middle: details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-sm relative z-10 space-y-3"
      >
        {/* Beneficiary detail */}
        {isMobile ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Beneficiaire</p>
            {provider && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operateur</span>
                <span className="text-[11px] font-black text-white">{provider}</span>
              </div>
            )}
            {phone && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telephone</span>
                <span className="text-[11px] font-mono font-bold text-slate-300">{phone}</span>
              </div>
            )}
          </div>
        ) : bankName || accountNumber ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Beneficiaire Bancaire</p>
            {bankName && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banque</span>
                <span className="text-[11px] font-black text-white">{bankName}</span>
              </div>
            )}
            {accountName && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titulaire</span>
                <span className="text-[11px] font-bold text-slate-300">{accountName}</span>
              </div>
            )}
            {accountNumber && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compte</span>
                <span className="text-[11px] font-mono font-bold text-slate-300 max-w-[180px] truncate text-right">{accountNumber}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Processing time info */}
        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-left">
          <ShieldCheck size={18} className="text-blue-400 flex-shrink-0" />
          <p className="text-[10px] font-bold text-slate-400">
            Delai estime : <span className="text-white">15 min (Mobile)</span> a{" "}
            <span className="text-white">48h (Banque)</span>
          </p>
        </div>

        {/* Ref copy card */}
        {ref && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
              <p className="text-sm font-mono font-bold text-white/90 truncate max-w-[200px]">{ref}</p>
            </div>
            <button
              onClick={copyRef}
              className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:scale-90 transition-all"
            >
              <Copy size={18} className="text-blue-400" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Bottom: actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-sm space-y-3 relative z-10"
      >
        {/* View receipt */}
        <Link href={`/withdraw/receipt?${receiptParams.toString()}`} className="block">
          <button className="w-full h-16 bg-white text-[#020617] rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-between px-8 hover:bg-slate-100 active:scale-[0.97] transition-all">
            <div className="flex items-center gap-3">
              <Receipt size={20} />
              <span>Voir le recu</span>
            </div>
            <ArrowRight size={20} />
          </button>
        </Link>

        {/* Dashboard + share row */}
        <div className="grid grid-cols-5 gap-3">
          <Link href="/dashboard" className="col-span-4">
            <button className="w-full h-16 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all">
              <Wallet size={20} />
              Retour au Wallet
            </button>
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "PimPay Retrait",
                  text: `Retrait de ${formatAmount(amount)} ${currency} en cours. Ref: ${ref}`,
                });
              } else {
                copyRef();
              }
            }}
            className="col-span-1 h-16 bg-white/5 border border-white/10 text-white rounded-[2rem] flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* New withdrawal */}
        <button
          onClick={() => router.push("/withdraw")}
          className="w-full h-12 bg-transparent border border-white/10 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-white/20 hover:text-slate-400 transition-all"
        >
          Nouveau retrait
        </button>
      </motion.div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 opacity-20 relative z-10">
        <div className="flex items-center gap-2">
          <Activity size={12} />
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">PimPay Secure Protocol</span>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
