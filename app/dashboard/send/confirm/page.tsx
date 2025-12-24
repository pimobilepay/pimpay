"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, ShieldCheck, Zap, ArrowRight, 
  Loader2, Lock, ChevronRight, X 
} from "lucide-react";
import { toast } from "sonner";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États de la transaction
  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");

  // Données de transaction
  const recipientId = searchParams.get("recipientId");
  const recipientName = searchParams.get("recipientName") || "Utilisateur";
  const amount = parseFloat(searchParams.get("amount") || "0");
  const description = searchParams.get("description") || "Transfert Pi";
  const totalDebit = amount + 0.01;

  // Gestion du clavier PIN
  const handleNumberClick = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Une fois le PIN complet (4 chiffres), on lance la transaction
  useEffect(() => {
    if (pin.length === 4) {
      executeTransaction();
    }
  }, [pin]);

  const executeTransaction = async () => {
    setIsPinModalOpen(false);
    setIsLoading(true);
    try {
      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, amount, description }),
      });

      if (response.ok) {
        router.push(`/send/success?amount=${amount}&name=${encodeURIComponent(recipientName)}`);
      } else {
        const result = await response.json();
        router.push(`/send/failed?error=${encodeURIComponent(result.error || "Échec")}`);
      }
    } catch (err) {
      router.push(`/send/failed?error=Erreur de communication`);
    } finally {
      setIsLoading(false);
      setPin("");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full"><ArrowLeft size={20} /></button>
        <div className="text-right">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Vérification</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Dernière étape</p>
        </div>
      </div>

      {/* CARTE DE RÉSUMÉ */}
      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-8 shadow-2xl">
        <div className="p-10 text-center bg-white/[0.01]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Montant final</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black">{amount}</span>
            <span className="text-2xl font-black italic text-blue-500">π</span>
          </div>
        </div>

        <div className="p-6 space-y-5 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">Destinataire</span>
            <span className="text-sm font-bold uppercase">{recipientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">Frais Réseau</span>
            <span className="text-sm font-bold text-blue-400">0.01 π</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 font-black text-[11px] uppercase">Total à débiter</span>
            <span className="text-xl font-black">{totalDebit.toFixed(2)} π</span>
          </div>
        </div>
      </div>

      {/* BOUTON D'ACTIVATION PIN */}
      <button
        onClick={() => setIsPinModalOpen(true)}
        disabled={isLoading}
        className="w-full bg-blue-600 py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : <><span className="font-black uppercase tracking-widest">Signer la transaction</span><Lock size={18} /></>}
      </button>

      {/* MODAL CLAVIER PIN */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-md flex flex-col justify-end animate-in slide-in-from-bottom duration-300">
          <div className="p-8 pb-12 bg-slate-900/80 rounded-t-[40px] border-t border-white/10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-500">Code de sécurité</h2>
              <button onClick={() => { setIsPinModalOpen(false); setPin(""); }} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
            </div>

            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 text-balance px-10">
              Entrez votre code secret pour valider le transfert de {amount} π
            </p>

            {/* DOTS DU PIN */}
            <div className="flex justify-center gap-4 mb-12">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 border-blue-500/50 transition-all duration-200 ${pin.length > i ? "bg-blue-500 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : ""}`} />
              ))}
            </div>

            {/* CLAVIER NUMÉRIQUE */}
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => key === "delete" ? handleDelete() : key !== "" && handleNumberClick(key)}
                  className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:bg-blue-600/20 ${key === "" ? "invisible" : "bg-white/5 border border-white/5"}`}
                >
                  {key === "delete" ? "←" : key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return <Suspense><ConfirmContent /></Suspense>;
}
