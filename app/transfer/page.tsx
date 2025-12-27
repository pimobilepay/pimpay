"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Scan,
  Send,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // États du formulaire
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [balance, setBalance] = useState<number>(0);

  // États visuels
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const fetchWallet = async () => {
      try {
        const res = await fetch('/api/user/wallet-info');
        if (res.ok) {
          const data = await res.json();
          /**
           * CORRECTION STRUCTURE PRISMA : 
           * Le solde est maintenant dans data.userData.balance
           */
          setBalance(parseFloat(data.userData?.balance || 0));
        } else if (res.status === 401) {
          router.push("/auth/login");
        }
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchWallet();
    const addr = searchParams.get("address");
    if (addr) setRecipientId(addr);
  }, [searchParams, router]);

  useEffect(() => {
    const searchUser = async () => {
      if (recipientId.length >= 3) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/user/search?query=${encodeURIComponent(recipientId)}`);
          if (res.ok) {
            const data = await res.json();
            setRecipientData(data);
          } else {
            setRecipientData(null);
          }
        } catch (err) {
          setRecipientData(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setRecipientData(null);
      }
    };
    const timer = setTimeout(searchUser, 500);
    return () => clearTimeout(timer);
  }, [recipientId]);

  const handleGoToSummary = () => {
    const finalRecipientId = recipientData?.id || recipientId;

    if (!finalRecipientId || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount > balance) {
      toast.error("Solde insuffisant");
      return;
    }

    const params = new URLSearchParams({
      recipientId: finalRecipientId,
      recipientName: recipientData?.name || recipientId,
      amount: amount,
      description: description || "Transfert Pi"
    });

    router.push(`/transfer/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      <div className="flex items-center gap-4 mb-10 pt-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Envoyer Pi</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Étape 1 sur 2</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Champ Destinataire */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Destinataire</label>
          <div className="relative">
            <input
              type="text"
              placeholder="@username ou adresse"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-[22px] p-5 pl-14 text-sm focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-5 top-5 text-slate-500" size={20} />
            <button onClick={() => setIsScanning(true)} className="absolute right-4 top-3.5 p-2.5 bg-blue-600 rounded-xl">
              <Scan size={18} />
            </button>
          </div>

          {isSearching && <div className="text-[10px] text-blue-400 font-bold uppercase px-4 flex gap-2"><Loader2 className="animate-spin" size={12}/> Recherche...</div>}

          {recipientData && (
            <div className="mx-2 flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-[20px]">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black">
                {recipientData.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-tight">{recipientData.name}</p>
                <p className="text-[9px] text-blue-400 uppercase font-black">Destinataire validé</p>
              </div>
              <CheckCircle2 className="text-blue-500" size={20} />
            </div>
          )}
        </div>

        {/* Champ Montant */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Montant</label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-[32px] p-6 text-3xl font-black outline-none focus:border-blue-500 transition-all text-center"
            />
            <span className="absolute right-8 top-8 text-blue-500 font-black italic">π</span>
          </div>
          <p className="text-center text-[11px] font-bold text-slate-500 uppercase">
            Disponible : {balance.toFixed(4)} π
          </p>
        </div>

        {/* Champ Note */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Note</label>
          <input
            type="text"
            placeholder="Raison du transfert..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-[20px] p-5 text-sm outline-none"
          />
        </div>

        {/* Bouton de validation */}
        <button
          onClick={handleGoToSummary}
          className="w-full bg-blue-600 py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-600/20"
        >
          <span className="font-black uppercase tracking-widest text-sm">Vérifier le résumé</span>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
