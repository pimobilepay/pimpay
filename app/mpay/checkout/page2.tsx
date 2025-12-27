"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  ChevronRight, 
  Loader2,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function MPayPaymentMethod() {
  const router = useRouter();
  const params = useSearchParams();

  const amount = params.get("amount") || "0";
  const receiver = params.get("to") || "Utilisateur PimPay";
  const txid = params.get("txid") || "";

  const [selected, setSelected] = useState("wallet");
  const [loading, setLoading] = useState(false);

  const methods = [
    { 
      id: "wallet", 
      title: "Wallet (Pi)", 
      description: "Solde disponible en π Network", 
      icon: <Zap size={24} />,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    { 
      id: "usd", 
      title: "Solde USD", 
      description: "Utiliser vos fonds en dollars", 
      icon: <DollarSign size={24} />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    { 
      id: "card", 
      title: "Visa PimPay", 
      description: "Payer via votre carte virtuelle", 
      icon: <CreditCard size={24} />,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    { 
      id: "external", 
      title: "Pi Browser", 
      description: "Portefeuille externe Pi Network", 
      icon: <Wallet size={24} />,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
  ];

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const payload = { to: receiver, amount: parseFloat(amount), method: selected, txid };
      const res = await fetch("/api/mpay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Paiement validé !");
        router.push(`/mpay/details?to=${receiver}&amount=${amount}&method=${selected}&txid=${txid}&status=success`);
      } else {
        toast.error(data.message || "Solde insuffisant");
      }
    } catch (err) {
      toast.error("Erreur de connexion au terminal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-32">
        
        {/* HEADER STYLE TERMINAL */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => router.back()} 
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Checkout</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">TXID: {txid.slice(0, 8)}...</p>
          </div>
        </div>

        {/* RECAPITULATIF DU MONTANT */}
        <div className="mb-12 text-center animate-in fade-in zoom-in duration-700">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Destinataire : {receiver}</p>
          <div className="inline-flex items-baseline gap-2">
            <h2 className="text-6xl font-black tracking-tighter italic text-white leading-none">{amount}</h2>
            <span className="text-2xl font-black text-blue-600 italic">π</span>
          </div>
          <div className="mt-4 flex justify-center">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Frais de réseau : 0.01 π
            </span>
          </div>
        </div>

        {/* LISTE DES MÉTHODES - STYLE WALLET */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 mb-2">Choisir une méthode</h3>
          
          {methods.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center justify-between p-5 rounded-[24px] transition-all duration-300 border ${
                  active 
                    ? "bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "bg-white/[0.03] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl transition-all ${active ? "bg-blue-600 text-white" : `${m.bg} ${m.color}`}`}>
                    {m.icon}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black uppercase tracking-tight ${active ? "text-white" : "text-slate-200"}`}>
                      {m.title}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 leading-tight">
                      {m.description}
                    </p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? "border-blue-500 bg-blue-500" : "border-white/10"}`}>
                  {active && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* SECURITÉ */}
        <div className="mt-8 flex items-center justify-center gap-2 opacity-40">
          <ShieldCheck size={14} className="text-blue-500" />
          <p className="text-[9px] font-black uppercase tracking-widest">Transaction sécurisée par PimPay Web3</p>
        </div>

        {/* BOUTON ACTION FIXE EN BAS (Mobile Friendly) */}
        <div className="fixed bottom-8 left-0 right-0 px-6 max-w-md mx-auto">
          <button
            onClick={handleContinue}
            disabled={loading}
            className={`w-full h-16 rounded-[22px] text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              loading 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>Confirmer le paiement</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
