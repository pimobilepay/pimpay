"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Scan,
  Send,
  CheckCircle2,
  Loader2,
  Wallet as WalletIcon,
  ChevronDown,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMountedRef = useRef(true);

  // États du formulaire
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("XAF");
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // États visuels
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  const networkFee = 0.01;

  // --- RÉCUPÉRATION DES SOLDES RÉELS (VACCINÉ) ---
  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        cache: 'no-store', // Vaccin anti-cache pour Pi Browser
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        setWallets(data.user.wallets || []);
        // Si XAF n'existe pas dans ses wallets, on prend le premier disponible
        if (data.user.wallets.length > 0 && !data.user.wallets.find((w: any) => w.currency === "XAF")) {
            setSelectedCurrency(data.user.wallets[0].currency);
        }
      }
    } catch (err) {
      console.error("Erreur soldes:", err);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    fetchWallets();

    const addr = searchParams.get("address");
    if (addr) setRecipientId(addr);

    return () => { isMountedRef.current = false; };
  }, [searchParams]);

  // Calcul du portefeuille actuel
  const currentWallet = wallets.find(w => w.currency === selectedCurrency) || { balance: 0 };

  // Logique de recherche destinataire
  useEffect(() => {
    const abortController = new AbortController();
    const searchUser = async () => {
      if (recipientId.length >= 3) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/user/search?query=${encodeURIComponent(recipientId)}`, {
            signal: abortController.signal
          });
          if (res.ok && isMountedRef.current) {
            const data = await res.json();
            setRecipientData(data);
          } else if (isMountedRef.current && (recipientId.startsWith("0x") || recipientId.length > 20)) {
            // Simulation pour adresses externes (Pi/BTC)
            setRecipientData({
              username: recipientId.slice(0, 8) + "...",
              firstName: "Compte",
              lastName: "Externe",
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientId}`,
              isExternal: true
            });
          } else {
            setRecipientData(null);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') setRecipientData(null);
        } finally {
          if (isMountedRef.current) setIsSearching(false);
        }
      } else {
        setRecipientData(null);
      }
    };
    const timer = setTimeout(searchUser, 600);
    return () => { clearTimeout(timer); abortController.abort(); };
  }, [recipientId]);

  const handleGoToSummary = async () => {
    if (!recipientId || !amount) {
      toast.error("Champs incomplets");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0) return toast.error("Montant invalide");
    
    if (numericAmount > currentWallet.balance) {
      toast.error(`Solde insuffisant en ${selectedCurrency}`);
      return;
    }

    setIsSubmitting(true);
    // On passe au résumé avec les données réelles
    const params = new URLSearchParams({
      recipient: recipientId,
      recipientName: recipientData ? `${recipientData.firstName} ${recipientData.lastName}` : recipientId,
      recipientAvatar: recipientData?.avatar || "",
      amount: amount,
      currency: selectedCurrency,
      fee: networkFee.toString(),
      description: description || "Transfert PimPay"
    });
    
    router.push(`/transfer/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 min-h-screen bg-[#020617] text-white font-sans">
      <div className="max-w-md mx-auto px-6 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => router.back()} className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Envoyer</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">PimPay Secure Protocol</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* SÉLECTEUR DE COMPTE RÉEL */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Source des fonds</label>
            <div className="relative">
              <button
                disabled={isLoadingWallets}
                onClick={() => setShowWalletPicker(!showWalletPicker)}
                className="w-full bg-slate-900/80 border border-white/5 rounded-[22px] p-4 flex items-center justify-between hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">
                    {selectedCurrency === "PI" ? "π" : <WalletIcon size={18} />}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">{selectedCurrency}</p>
                    <p className="text-[10px] text-emerald-500 font-bold">
                      {currentWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} disponible
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-slate-500 transition-transform ${showWalletPicker ? 'rotate-180' : ''}`} />
              </button>

              {showWalletPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-[22px] overflow-hidden z-50 shadow-2xl animate-in zoom-in-95 duration-200">
                  {wallets.length > 0 ? wallets.map((w) => (
                    <button
                      key={w.currency}
                      onClick={() => { setSelectedCurrency(w.currency); setShowWalletPicker(false); }}
                      className="w-full p-4 flex items-center gap-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black uppercase">
                        {w.currency === "PI" ? "π" : w.currency.slice(0, 2)}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-xs font-black uppercase">{w.currency}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{w.balance.toLocaleString()} {w.currency}</p>
                      </div>
                      {selectedCurrency === w.currency && <CheckCircle2 size={16} className="text-blue-500" />}
                    </button>
                  )) : (
                    <div className="p-4 text-[10px] text-center text-slate-500 font-black">AUCUN WALLET TROUVÉ</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RECHERCHE DESTINATAIRE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Bénéficiaire</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Pseudo, email ou adresse..."
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-[22px] p-5 pl-14 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
              />
              <Search className="absolute left-5 top-5 text-slate-500" size={20} />
              <button 
                onClick={() => toast.info("Scanner bientôt disponible")}
                className="absolute right-4 top-3.5 p-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors"
              >
                <Scan size={18} />
              </button>
            </div>

            {isSearching && (
              <div className="text-[9px] text-blue-400 font-black uppercase px-4 flex gap-2 items-center tracking-widest">
                <Loader2 className="animate-spin" size={12}/> Recherche sur la blockchain PimPay...
              </div>
            )}

            {recipientData && (
              <div className="mx-2 flex items-center gap-4 p-4 border rounded-[24px] bg-blue-600/5 border-blue-600/20 animate-in slide-in-from-top-2">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img src={recipientData.avatar} alt="Avatar" className="w-full h-full rounded-full border-2 border-blue-500/30 object-cover bg-slate-800" />
                  {!recipientData.isExternal && (
                    <div className="absolute -bottom-1 -right-1 bg-[#020617] p-0.5 rounded-full">
                      <ShieldCheck className="text-blue-500" size={14} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">
                    {recipientData.firstName} {recipientData.lastName}
                  </p>
                  <p className="text-[9px] text-blue-400 uppercase font-black tracking-tighter">
                    @{recipientData.username || 'pimuser'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MONTANT DYNAMIQUE */}
          <div className="space-y-6 pt-4">
            <div className="relative group">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent p-2 text-6xl font-black outline-none text-center text-white placeholder:text-white/5 transition-all"
              />
              <div className="flex justify-center items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                  {selectedCurrency}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Note de transfert</label>
              <input
                type="text"
                placeholder="Ex: Remboursement dîner 🍕"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900/40 border border-white/5 rounded-[20px] p-5 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
              />
            </div>

            <button
              disabled={isSubmitting || !amount || !recipientId}
              onClick={handleGoToSummary}
              className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all shadow-xl font-black uppercase tracking-widest text-sm ${
                isSubmitting || !amount || !recipientId 
                ? 'bg-slate-800 text-slate-600' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <span>Continuer</span>
                  <Send size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
      </div>
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
