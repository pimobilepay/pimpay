"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertTriangle, Wallet, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { PiButton } from "@/components/PiButton"; // Importation du composant PiButton
import { toast } from "sonner";

const PI_GCV_PRICE = 314159;

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref = searchParams.get("ref");
  const method = searchParams.get("method") || "mobile";
  const amountParam = searchParams.get("amount") || "0";

  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const goToSuccess = useCallback((reference: string) => {
    router.push(`/deposit/success?ref=${reference}`);
  }, [router]);

  // Récupération des détails de la transaction créée à l'étape précédente
  const fetchTransactionDetails = useCallback(async () => {
    if (!ref || !mounted) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "SUCCESS") {
          goToSuccess(ref);
          return;
        }
        setTransaction(data);
      }
    } catch (e) {
      console.error("Fetch Error", e);
    } finally {
      setLoading(false);
    }
  }, [ref, mounted, goToSuccess]);

  useEffect(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]);

  // Polling automatique pour Mobile Money uniquement
  useEffect(() => {
    if (!ref || method === "crypto" || method === "Pi Network") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "SUCCESS") {
            clearInterval(interval);
            goToSuccess(ref);
          }
        }
      } catch (e) { console.error("Polling error", e); }
    }, 5000);
    return () => clearInterval(interval);
  }, [ref, method, goToSuccess]);

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Sécurisation du flux...</p>
    </div>
  );

  // LOGIQUE DE CONVERSION PIMPAY
  // Si c'est Pi, on affiche le montant en PI (USD / GCV)
  const isPi = method.toLowerCase().includes("pi") || method === "crypto";
  const rawAmount = transaction?.amount || parseFloat(amountParam);
  const displayAmount = isPi ? (rawAmount / PI_GCV_PRICE) : rawAmount;
  const displayCurrency = isPi ? "PI" : "USD";
  const fees = transaction?.fee || (rawAmount * 0.02);

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-36 font-sans overflow-x-hidden">
      <div className="px-6 pt-10 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight leading-none">Récapitulatif</h1>
          <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1">Validation de dépôt</p>
        </div>
      </div>

      <div className="px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* CARTE MONTANT CONVERTI */}
        <Card className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={80} /></div>
          <p className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-[0.2em]">Montant à transférer</p>
          <div className="flex items-center justify-center gap-2">
             <span className="text-5xl font-black tracking-tighter">
                {isPi ? displayAmount.toFixed(7) : displayAmount.toLocaleString()}
             </span>
             <span className="text-xl font-bold text-blue-500 uppercase">{displayCurrency}</span>
          </div>
          {isPi && (
            <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Basé sur le consensus GCV : $314,159
            </p>
          )}
        </Card>

        {/* DETAILS DE LA TRANSACTION */}
        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">ID Référence</span>
            <span className="text-blue-400 font-mono tracking-normal">{ref}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Méthode</span>
            <span className="text-white">{method}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Frais de réseau</span>
            <span className="text-red-400">+{isPi ? (fees/PI_GCV_PRICE).toFixed(7) : fees.toFixed(2)} {displayCurrency}</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Statut</span>
            <span className="flex items-center gap-2 text-amber-500">
              <Loader2 size={12} className="animate-spin" />
              En attente
            </span>
          </div>
        </Card>

        {/* INFO BOX */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
             <AlertTriangle className="text-blue-500" size={20} />
          </div>
          <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
            {isPi 
              ? "Veuillez utiliser le bouton sécurisé ci-dessous pour signer votre transaction dans le Pi Browser."
              : "Le système détecte automatiquement votre paiement Mobile Money. Ne fermez pas cette page."}
          </p>
        </div>

        {/* SECTION ACTION : BOUTON PI OU BOUTON MANUEL */}
        <div className="space-y-4">
          {isPi ? (
            <PiButton 
              amount={displayAmount}
              memo={`Dépôt PimPay Ref: ${ref}`}
              onSuccess={(txid) => goToSuccess(ref || txid)}
              label="Payer avec mon Pi Wallet"
            />
          ) : (
            <button
              onClick={fetchTransactionDetails}
              className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              Vérifier mon paiement
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 opacity-30 pt-4">
          <ShieldCheck size={14} />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white">Sécurisé par PimPay Flow Engine</span>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

export default function DepositSummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <SummaryContent />
    </Suspense>
  );
}
