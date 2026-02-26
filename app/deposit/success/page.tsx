"use client";
import { Suspense, useState, useEffect, useCallback } from "react"; 
import { CheckCircle2, ArrowRight, Receipt, Wallet, Loader2, Share2, Info, Lock, Copy } from "lucide-react"; 
import Link from "next/link"; 
import { useSearchParams, useRouter } from "next/navigation"; 
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams(); 
  const router = useRouter(); 
  const ref = searchParams.get("ref"); 
  const txid = searchParams.get("txid"); 
  const [transaction, setTransaction] = useState<any>(null); 
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    if (!ref && !txid) { setLoading(false); return; }
    try {
      const params = new URLSearchParams(); 
      if (txid) params.set("txid", txid); 
      if (ref) params.set("ref", ref);
      
      const res = await fetch(`/api/transactions/details?${params.toString()}`);
      
      if (res.ok) {
        const data = await res.json(); 
        setTransaction(data);
        
        // Si malgré l'appel elle reste en PENDING, on redirige vers le résumé
        if (data.status === "PENDING") { 
          toast.info("Transaction en cours de traitement...");
          router.replace(`/deposit/summary?ref=${ref || txid}`); 
        } else if (data.status === "FAILED") {
          toast.error("La transaction a échoué");
          router.replace("/dashboard");
        }
      } else { 
        toast.error("Transaction introuvable"); 
      }
    } catch (e) { 
      console.error(e); 
      toast.error("Erreur de connexion au serveur");
    } finally { 
      setLoading(false); 
    }
  }, [ref, txid, router]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  // Constantes de calcul PimPay
  const PI_GCV_PRICE = 314159;
  const currency = transaction?.currency || "PI";
  const amount = transaction?.amount || 0;
  
  // Calculs dynamiques
  const amountPI = currency === "PI" ? amount : amount / PI_GCV_PRICE;
  const amountUSD = currency === "USD" ? amount : (currency === "PI" ? amount * PI_GCV_PRICE : amount);
  const reference = transaction?.reference || ref || "PIMPAY-TX";

  const copyRef = () => { 
    navigator.clipboard.writeText(reference); 
    toast.success("Référence copiée !"); 
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-500 mb-4 mx-auto" size={40} />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sécurisation du Ledger...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header & Status */}
      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl mb-6">
          <CheckCircle2 className="text-emerald-500" size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Dépôt Confirmé</h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Votre compte PimPay a été crédité</p>

        <div className="mt-8">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">
              {currency === "PI" ? amountPI.toFixed(4) : amount.toLocaleString()}
            </span>
            <span className="text-xl font-bold text-blue-500">{currency}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
            ≈ ${amountUSD.toLocaleString()} USD (GCV Price)
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-4">
          <div className="text-left">
            <p className="text-[8px] font-black text-slate-500 uppercase">Référence</p>
            <p className="text-xs font-bold text-white tracking-tight">{reference}</p>
          </div>
          <button onClick={copyRef} className="p-2 bg-white/5 rounded-lg active:scale-90 transition-transform">
            <Copy size={16} className="text-blue-400" />
          </button>
        </div>

        <Link href={`/deposit/receipt?ref=${reference}`} className="block">
          <button className="w-full h-14 bg-white text-[#020617] rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-between px-6 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3"><Receipt size={18} /><span>Télécharger le reçu</span></div>
            <ArrowRight size={18} />
          </button>
        </Link>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <button className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
              <Wallet size={16} /> Dashboard
            </button>
          </Link>
          <button 
            onClick={() => {
              if(navigator.share) {
                navigator.share({ title: 'PimPay Success', text: `Dépôt réussi sur PimPay ! Réf: ${reference}` });
              } else {
                copyRef();
              }
            }}
            className="h-14 px-5 bg-white/5 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center active:bg-white/10 transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Footer Label */}
      <div className="flex items-center gap-2 opacity-30 select-none">
        <Lock size={12} />
        <span className="text-[8px] font-bold uppercase tracking-widest italic">PimPay Secure Ledger</span>
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
