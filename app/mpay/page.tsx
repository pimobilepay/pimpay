"use client";

import { useState, useEffect } from "react";
import {
  Scan, ArrowLeft, Zap, ShieldCheck,
  Store, Info, Loader2, CheckCircle2,
  X, Search, Landmark, Fingerprint,
  Cpu, Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MPayPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Scan/ID, 2: Amount, 3: Confirm, 4: Success
  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [txPriority, setTxPriority] = useState("fast"); // low, fast, instant

  // Simulation récupération solde PimPay
  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => setUserBalance(data.balance || 0))
      .catch(() => setUserBalance(3141.59)); // Fallback démo
  }, []);

  const handleNextStep = () => {
    if (step === 1 && merchantId.length < 5) {
      return toast.error("Identifiant marchand invalide");
    }
    if (step === 2 && (parseFloat(amount) <= 0 || !amount)) {
      return toast.error("Veuillez entrer un montant");
    }
    if (step === 2 && parseFloat(amount) > userBalance) {
      return toast.error("Solde insuffisant dans votre pool PimPay");
    }
    setStep(step + 1);
  };

  const executePayment = async () => {
    setIsLoading(true);
    try {
      // Simulation de signature cryptographique PimPay
      await new Promise(resolve => setTimeout(resolve, 2500));
      setStep(4);
      toast.success("Transaction mPay inscrite sur le registre !");
    } catch (error) {
      toast.error("Échec du consensus réseau");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER FIXED */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">mPay Instant</h1>
            <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">Liquidity Protocol</p>
        </div>
        <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500">
            <Activity size={20} className="animate-pulse" />
        </div>
      </header>

      <main className="px-6 pt-8 pb-32">
        {/* ÉTAPE 1: SCAN OU RECHERCHE MARCHAND */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[40px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-slate-900/60 border border-white/10 rounded-[40px] p-10 flex flex-col items-center backdrop-blur-md">
                <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                      <Scan size={44} className="text-white" />
                    </div>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Scanner QR mPay</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest text-center">Protocol V2.0 Ready</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/10"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Web3 Identity Search</span>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>

              <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-blue-500/50 transition-all">
                <div className="p-4 bg-white/5 rounded-2xl text-slate-400">
                    <Store size={20} />
                </div>
                <input
                  type="text"
                  placeholder="ID MARCHAND (EX: PIMPAY-01)"
                  className="bg-transparent flex-1 outline-none font-black text-sm uppercase placeholder:text-slate-700"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
                <button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20">
                  <Search size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2: MONTANT & NETWORK FEE */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-slate-900/40 border border-white/10 rounded-[40px] p-8 text-center relative overflow-hidden backdrop-blur-md">
               <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20">
                        <Cpu size={24} />
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">{merchantId || "MARCHAND PIMPAY"}</span>
               </div>
               
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant du Transfert</div>
               <div className="flex items-center justify-center">
                 <span className="text-5xl font-black text-blue-500 mr-2">π</span>
                 <input
                  type="number"
                  autoFocus
                  placeholder="0.00"
                  className="bg-transparent text-6xl font-black outline-none w-full text-center placeholder:text-slate-800 tracking-tighter"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                 />
               </div>
               
               <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center px-2">
                    <div className="text-left">
                        <p className="text-[9px] font-black text-slate-500 uppercase">Solde Dispo</p>
                        <p className="text-sm font-black text-emerald-400">{userBalance.toLocaleString()} π</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase">Network Fee</p>
                        <p className="text-sm font-black text-white">0.00 π</p>
                    </div>
               </div>
            </div>

            {/* PRIORITÉ DE TRANSACTION (Web3 Style) */}
            <div className="grid grid-cols-3 gap-3">
                {['low', 'fast', 'instant'].map((p) => (
                    <button 
                        key={p}
                        onClick={() => setTxPriority(p)}
                        className={`py-4 rounded-2xl border text-[9px] font-black uppercase transition-all ${txPriority === p ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <button
              onClick={handleNextStep}
              className="w-full bg-blue-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all mt-4"
            >
              Vérifier la Transaction
            </button>
          </div>
        )}

        {/* ÉTAPE 3: CONFIRMATION & BIOMETRY */}
        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900/60 border border-white/10 rounded-[3rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck size={120} />
              </div>

              <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[3px] text-blue-500 mb-1">Résumé Web3</h2>
                    <p className="text-2xl font-black uppercase italic">Signature</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Total Debit</p>
                    <p className="text-2xl font-black text-white">{amount} π</p>
                </div>
              </div>

              <div className="space-y-3">
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">ID Marchand</span>
                    <span className="font-black text-xs text-blue-400 underline decoration-blue-500/30 underline-offset-4 uppercase">{merchantId}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Protocole</span>
                    <span className="font-black text-xs uppercase">PimPay mPay Node</span>
                  </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
                    <Fingerprint size={32} />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Signature biométrique requise</p>
              </div>
            </div>

            <button
              onClick={executePayment}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-7 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
              {isLoading ? "Broadcasting to Node..." : "Signer & Envoyer"}
            </button>
          </div>
        )}

        {/* ÉTAPE 4: SUCCÈS - INVOICE WEB3 */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-50 duration-700">
            <div className="relative mb-8">
                <div className="absolute -inset-6 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 size={56} className="text-emerald-500" />
                </div>
            </div>
            
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Confirmed</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-10 text-center px-12 leading-loose">
              Transaction finalisée sur le registre décentralisé PimPay.<br/>
              <span className="text-blue-500 font-black">Hash: {Math.random().toString(36).substring(2, 15).toUpperCase()}</span>
            </p>

            <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-[3rem] p-8 mb-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Recipient</p>
                        <p className="text-sm font-black uppercase tracking-tight">{merchantId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Status</p>
                        <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-3 py-1 rounded-full border border-emerald-500/20">SUCCESS</span>
                    </div>
                </div>
              <p className="text-[10px] font-black text-slate-500 uppercase text-center mb-2">Montant Liquidé</p>
              <p className="text-5xl font-black text-white text-center tracking-tighter">{amount} <span className="text-blue-500">π</span></p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-white text-black p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Retour au Portefeuille
            </button>
          </div>
        )}
      </main>

      {/* FOOTER INFO */}
      {step < 4 && (
        <div className="fixed bottom-10 left-0 right-0 px-8">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3 text-slate-400">
                    <Landmark size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">mPay Node Protocol</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-[8px] font-black text-emerald-500 uppercase">Online</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
