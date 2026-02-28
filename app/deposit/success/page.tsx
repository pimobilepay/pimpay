"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { CheckCircle2, ArrowRight, Receipt, Wallet, Loader2, Share2, Lock, Copy } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Récupération des données depuis l'URL pour un affichage immédiat
  const ref = searchParams.get("ref");
  const txid = searchParams.get("txid");
  const urlAmount = searchParams.get("amount"); // Ajouté pour récupérer le montant saisi
  const urlCurrency = searchParams.get("currency") || "PI";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    // Si on a les infos dans l'URL, on peut arrêter le loader global rapidement
    if (!ref && !txid) { 
      setLoading(false); 
      return; 
    }

    try {
      const params = new URLSearchParams();
      if (txid) params.set("txid", txid);
      if (ref) params.set("ref", ref);

      const res = await fetch(`/api/transaction/details?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });

      if (res.ok) {
        const data = await res.json();
        setTransaction(data);

        if (data.status === "PENDING") {
          // On attend un peu pour laisser le temps au worker de valider
          setTimeout(() => {
             // Optionnel : rafraîchir ou rediriger si nécessaire
          }, 3000);
        }
      }
    } catch (e) {
      console.error("Erreur sync:", e);
    } finally {
      setLoading(false);
    }
  }, [ref, txid]);

  useEffect(() => { 
    fetchTx(); 
  }, [fetchTx]);

  // --- LOGIQUE D'AFFICHAGE PRIORITAIRE ---
  // On utilise la donnée de l'API, sinon celle de l'URL
  const PI_GCV_PRICE = 314159;
  const currency = transaction?.currency || urlCurrency;
  const amount = Number(transaction?.amount) || Number(urlAmount) || 0;

  let amountDisplay = amount;
  let amountUSD = 0;

  if (currency === "PI") {
    amountDisplay = amount;
    amountUSD = amount * PI_GCV_PRICE;
  } else if (currency === "XAF") {
    amountDisplay = amount;
    amountUSD = amount / 600;
  } else {
    amountDisplay = amount;
    amountUSD = amount; // Pour USD/BUSD/DAI
  }

  const reference = transaction?.reference || ref || txid || "PIMPAY-TX";

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Référence copiée !");
  };

  if (loading && !urlAmount) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-500 mb-4 mx-auto" size={40} />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Chargement du reçu...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 relative z-10">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl mb-8">
          <CheckCircle2 className="text-emerald-500" size={42} strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Succès !</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Transfert confirmé par PimPay</p>

        <div className="mt-10">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black text-white tracking-tighter">
              {currency === "PI" ? amountDisplay.toFixed(4) : amountDisplay.toLocaleString('fr-FR')}
            </span>
            <span className="text-xl font-bold text-blue-500">{currency}</span>
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-3 font-black uppercase tracking-widest bg-emerald-500/5 py-1 px-3 rounded-full border border-emerald-500/10 inline-block">
            ≈ ${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 relative z-10">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 flex items-center justify-between backdrop-blur-md">
          <div className="text-left">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">ID Transaction</p>
            <p className="text-sm font-mono font-bold text-white/90 truncate max-w-[200px]">{reference}</p>
          </div>
          <button onClick={copyRef} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:scale-90 transition-all">
            <Copy size={18} className="text-blue-400" />
          </button>
        </div>

        <Link href={`/deposit/receipt?ref=${reference}`} className="block">
          <button className="w-full h-16 bg-white text-[#020617] rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-between px-8 hover:bg-slate-100 active:scale-[0.97] transition-all">
            <div className="flex items-center gap-3"><Receipt size={20} /><span>Voir le reçu</span></div>
            <ArrowRight size={20} />
          </button>
        </Link>

        <div className="grid grid-cols-5 gap-3">
          <Link href="/dashboard" className="col-span-4">
            <button className="w-full h-16 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all">
              <Wallet size={20} /> Retour au Wallet
            </button>
          </Link>
          <button
            onClick={() => {
              if(navigator.share) {
                navigator.share({ title: 'PimPay Success', text: `Transaction de ${amountDisplay} ${currency} réussie !` });
              } else { copyRef(); }
            }}
            className="col-span-1 h-16 bg-white/5 border border-white/10 text-white rounded-[2rem] flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 opacity-20">
        <div className="flex items-center gap-2">
          <Lock size={12} />
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Ledger</span>
        </div>
      </div>
    </div>
  );
}

export default function DepositSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
