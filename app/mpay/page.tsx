"use client";

import { useState, useEffect } from "react";
import { 
  Scan, ArrowLeft, Zap, ShieldCheck, 
  Store, Info, Loader2, CheckCircle2, 
  X, Search, Landmark
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

  // Simulation récupération solde
  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => setUserBalance(data.balance || 0));
  }, []);

  const handleNextStep = () => {
    if (step === 1 && merchantId.length < 5) {
      return toast.error("Identifiant marchand invalide");
    }
    if (step === 2 && (parseFloat(amount) <= 0 || !amount)) {
      return toast.error("Veuillez entrer un montant");
    }
    if (step === 2 && parseFloat(amount) > userBalance) {
      return toast.error("Solde insuffisant");
    }
    setStep(step + 1);
  };

  const executePayment = async () => {
    setIsLoading(true);
    try {
      // Simulation de transaction blockchain mPay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep(4);
      toast.success("Paiement marchand validé !");
    } catch (error) {
      toast.error("Échec de la transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER FIXED */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter">mPay Instant</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6 pt-4">
        {/* ÉTAPE 1: SCAN OU RECHERCHE MARCHAND */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-slate-900/60 border border-white/10 rounded-[32px] p-8 flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 text-blue-500">
                  <Scan size={40} className="animate-pulse" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight">Scanner le QR Code</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Paiement sans contact sécurisé</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-white/5"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">OU SAISIR L'ID</span>
                <div className="h-[1px] flex-1 bg-white/5"></div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                <Store className="text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="ID MARCHAND (ex: MPAY-882)" 
                  className="bg-transparent flex-1 outline-none font-bold text-sm uppercase placeholder:text-slate-700"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
                <button onClick={handleNextStep} className="bg-blue-600 p-2 rounded-xl">
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2: MONTANT */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-blue-600/20">
                <Store size={30} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Marchand Vérifié</h2>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{merchantId || "PIMPAY-STORE"}</p>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-[40px] p-8 text-center relative overflow-hidden">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Montant à payer</div>
               <div className="flex items-center justify-center gap-2">
                 <span className="text-4xl font-black text-blue-500">π</span>
                 <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00"
                  className="bg-transparent text-5xl font-black outline-none w-2/3 placeholder:text-slate-800"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                 />
               </div>
               <p className="text-[10px] font-bold text-emerald-500/50 mt-4 uppercase">
                 Solde disponible: {userBalance.toLocaleString()} π
               </p>
            </div>

            <button 
              onClick={handleNextStep}
              className="w-full bg-blue-600 p-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              Suivant
            </button>
          </div>
        )}

        {/* ÉTAPE 3: CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900/40 border border-white/10 rounded-[32px] p-6 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Récapitulatif</h2>
              
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Destinataire</span>
                <span className="font-black text-xs uppercase">{merchantId}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Montant</span>
                <span className="font-black text-blue-400">{amount} π</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Frais mPay</span>
                <span className="font-black text-emerald-400 text-xs">GRATUIT</span>
              </div>

              <div className="bg-blue-600/10 p-4 rounded-2xl flex items-start gap-3 border border-blue-500/20">
                <ShieldCheck size={20} className="text-blue-500 shrink-0" />
                <p className="text-[10px] font-bold text-blue-200/80 uppercase leading-relaxed">
                  Paiement sécurisé par le protocole PIMPAY Web3. Les fonds seront transférés instantanément.
                </p>
              </div>
            </div>

            <button 
              onClick={executePayment}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
              {isLoading ? "Validation Blockchain..." : "Payer Maintenant"}
            </button>
          </div>
        )}

        {/* ÉTAPE 4: SUCCÈS */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-50 duration-700">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500/30">
              <CheckCircle2 size={50} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Paiement Réussi</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 text-center">
              Transaction enregistrée sur le Mainnet<br/>ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>

            <div className="w-full bg-white/5 border border-white/5 rounded-[32px] p-6 mb-10 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Montant payé</p>
              <p className="text-3xl font-black text-white">{amount} π</p>
            </div>

            <button 
              onClick={() => router.push("/dashboard")}
              className="w-full bg-white text-black p-5 rounded-[24px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Retour au Dashboard
            </button>
          </div>
        )}
      </main>

      {/* FOOTER INFO (Uniquement étapes 1 & 2) */}
      {step < 4 && (
        <div className="fixed bottom-10 left-0 right-0 px-8">
            <div className="flex items-center justify-center gap-2 text-slate-600">
                <Landmark size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest italic">Secured by mPay Node Network</span>
            </div>
        </div>
      )}
    </div>
  );
}
