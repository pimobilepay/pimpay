"use client";

import { useState, useEffect, Suspense } from "react";
import { ArrowLeft, Send, Search, ShieldCheck, Camera } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRScanner } from "@/components/qr-scanner"; // Assure-toi que le chemin est correct

function SendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Récupérer l'identifiant si présent dans l'URL (via le scanner)
  useEffect(() => {
    const to = searchParams.get("to");
    if (to) {
      setIdentifier(to);
    }
  }, [searchParams]);

  const handleSend = async () => {
    if (!identifier || !amount || Number(amount) <= 0) {
      toast.error("Veuillez remplir tous les champs correctement.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("pimpay_token");

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ identifier, amount: Number(amount) })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`π ${amount} envoyés avec succès !`);
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      {/* SCANNER OVERLAY */}
      {showScanner && (
        <QRScanner onClose={() => setShowScanner(false)} />
      )}

      <header className="flex items-center gap-4 mb-10 pt-6">
        <Link href="/dashboard">
          <div className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
            <ArrowLeft size={20}/>
          </div>
        </Link>
        <h1 className="text-2xl font-black tracking-tighter italic uppercase">Envoyer PI</h1>
      </header>

      <div className="space-y-6 max-w-md mx-auto">
        {/* RECHERCHE DESTINATAIRE */}
        <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/10 space-y-4 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Destinataire</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email ou téléphone"
                className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-14 text-sm font-bold outline-none focus:border-blue-500/50 transition-all"
              />
              <button 
                onClick={() => setShowScanner(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600/30 transition-colors"
              >
                <Camera size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Montant (π)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-3xl font-black outline-none focus:border-blue-500/50 text-blue-500 placeholder:text-slate-800"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-xs text-slate-600">PI</span>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-2xl font-black uppercase text-xs tracking-[2px] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 mt-4"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Send size={18}/> Valider le transfert</>
            )}
          </button>
        </div>

        <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-[1.8rem] flex items-start gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <ShieldCheck className="text-blue-500" size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Transfert Sécurisé</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Les transactions internes sont protégées par le protocole PimPay. 
              Vérifiez bien l'identifiant, cette action est irréversible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export principal avec Suspense pour gérer useSearchParams
export default function SendPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-500 font-black uppercase tracking-widest animate-pulse">Chargement...</div>}>
      <SendContent />
    </Suspense>
  );
}
