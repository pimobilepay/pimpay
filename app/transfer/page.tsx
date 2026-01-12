"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Scan,
  Send,
  CheckCircle2,
  Loader2,
  Wallet as WalletIcon,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // États du formulaire
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("PI");
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // États visuels
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);

  // Frais de transaction (Simulés ou récupérés via API config)
  const networkFee = 0.01; 

  useEffect(() => {
    setMounted(true);
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setWallets(data.wallets || []);
        } else if (res.status === 401) {
          router.push("/auth/login");
        }
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      }
    };
    fetchUserData();
    
    const addr = searchParams.get("address");
    if (addr) setRecipientId(addr);
  }, [searchParams, router]);

  const currentWallet = wallets.find(w => w.currency === selectedCurrency) || { balance: 0 };

  useEffect(() => {
    const searchUser = async () => {
      if (recipientId.length >= 3) {
        setIsSearching(true);
        try {
          // Recherche par username, phone ou adresse wallet
          const res = await fetch(`/api/user/search?query=${encodeURIComponent(recipientId)}`);
          if (res.ok) {
            const data = await res.json();
            setRecipientData(Array.isArray(data) ? data[0] : data);
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
    const finalRecipientValue = recipientData?.username || recipientId;

    if (!finalRecipientValue || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0 || (numericAmount + networkFee) > currentWallet.balance) {
      toast.error("Montant invalide ou solde insuffisant (incluant les frais)");
      return;
    }

    const params = new URLSearchParams({
      recipient: finalRecipientValue,
      recipientName: recipientData?.name || recipientData?.username || finalRecipientValue,
      amount: amount,
      currency: selectedCurrency,
      fee: networkFee.toString(),
      description: description || `Transfert ${selectedCurrency}`
    });
    router.push(`/transfer/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-md mx-auto px-6 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.back()}
            className="p-3 bg-slate-900 border border-white/5 rounded-full hover:bg-slate-800 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Envoyer</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Protocole de transfert sécurisé</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* SÉLECTEUR DE WALLET SOURCE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Source du débit</label>
            <div className="relative">
              <button 
                onClick={() => setShowWalletPicker(!showWalletPicker)}
                className="w-full bg-slate-900/80 border border-white/5 rounded-[22px] p-4 flex items-center justify-between hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
                    <WalletIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">Compte {selectedCurrency}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Solde: {currentWallet.balance.toLocaleString()} {selectedCurrency}</p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-slate-500 transition-transform ${showWalletPicker ? 'rotate-180' : ''}`} />
              </button>

              {showWalletPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-[22px] overflow-hidden z-50 shadow-2xl">
                  {wallets.map((w) => (
                    <button
                      key={w.currency}
                      onClick={() => { setSelectedCurrency(w.currency); setShowWalletPicker(false); }}
                      className="w-full p-4 flex items-center gap-4 hover:bg-white/5 border-b border-white/5 last:border-0"
                    >
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {w.currency.slice(0,2)}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-xs font-black uppercase">{w.currency}</p>
                        <p className="text-[9px] text-slate-500">{w.balance.toLocaleString()} disponible</p>
                      </div>
                      {selectedCurrency === w.currency && <CheckCircle2 size={16} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DESTINATAIRE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Destinataire</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Pseudo, téléphone ou adresse..."
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-[22px] p-5 pl-14 text-sm text-white focus:border-blue-500 outline-none transition-all"
              />
              <Search className="absolute left-5 top-5 text-slate-500" size={20} />
              <button className="absolute right-4 top-3.5 p-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors">
                <Scan size={18} />
              </button>
            </div>

            {isSearching && (
              <div className="text-[10px] text-blue-400 font-bold uppercase px-4 flex gap-2">
                <Loader2 className="animate-spin" size={12}/> Recherche sur le réseau...
              </div>
            )}

            {recipientData && (
              <div className="mx-2 flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-[24px] animate-in fade-in slide-in-from-top-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs">
                  {(recipientData.name || recipientData.username || "?")?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">{recipientData.name || recipientData.username}</p>
                  <p className="text-[9px] text-blue-400 uppercase font-black tracking-widest">Utilisateur PimPay certifié</p>
                </div>
                <CheckCircle2 className="text-blue-500" size={20} />
              </div>
            )}
          </div>

          {/* MONTANT */}
          <div className="space-y-3 pt-2">
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent p-2 text-3xl font-black outline-none text-center text-white placeholder:text-white/5"
              />
              <span className="block text-center text-blue-500 font-black italic text-sm uppercase tracking-[0.3em] mt-2">
                {selectedCurrency}
              </span>
            </div>
            
            <div className="flex justify-between items-center px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Frais de réseau</span>
                <span className="text-[10px] font-black">{networkFee} {selectedCurrency}</span>
            </div>
          </div>

          {/* NOTE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Référence</label>
            <input
              type="text"
              placeholder="Ajouter un message..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900/40 border border-white/5 rounded-[20px] p-5 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          <button
            onClick={handleGoToSummary}
            className="w-full bg-blue-600 py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all hover:bg-blue-500 active:scale-95 shadow-2xl shadow-blue-600/20 mt-4"
          >
            <span className="font-black uppercase tracking-widest text-sm">Récapitulatif</span>
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
      </div>
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
