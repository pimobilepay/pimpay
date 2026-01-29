"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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

  // États du formulaire
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("XAF");
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // États visuels et redirection
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Lecture de l'adresse depuis l'URL (via QR ou lien externe)
    const addr = searchParams.get("address");
    if (addr) setRecipientId(addr);
  }, [searchParams, router]);

  const currentWallet = wallets.find(w => w.currency === selectedCurrency) || { balance: 0 };

  // Logique de recherche utilisateur / adresse
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
            // Détection adresse crypto externe si non trouvé en base
            if (recipientId.startsWith("0x") || recipientId.length > 25) {
              setRecipientData({
                username: recipientId.slice(0, 6) + "..." + recipientId.slice(-4),
                firstName: "Destinataire",
                lastName: "Externe",
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientId}`,
                isExternal: true
              });
            } else {
              setRecipientData(null);
            }
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

  // Fonction pour déclencher le scan (Ouvre la caméra sur mobile si configuré)
  const handleScanClick = () => {
    toast.info("Initialisation du scanner PimPay...");
    // Ici, tu pourrais utiliser une lib comme html5-qrcode
    // Pour l'instant on simule l'action
  };

  const handleGoToSummary = async () => {
    if (!recipientId || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0 || (numericAmount + networkFee) > currentWallet.balance) {
      toast.error("Solde insuffisant pour ce transfert");
      return;
    }

    setIsSubmitting(true); // Désactive le bouton

    // Petite attente pour l'effet "Calcul des protocoles de sécurité"
    setTimeout(() => {
      const params = new URLSearchParams({
        recipient: recipientData?.sidraAddress || recipientId,
        recipientName: recipientData?.firstName ? `${recipientData.firstName} ${recipientData.lastName}` : recipientId,
        recipientAvatar: recipientData?.avatar || "",
        amount: amount,
        currency: selectedCurrency,
        fee: networkFee.toString(),
        description: description || `Transfert PimPay`
      });
      router.push(`/transfer/summary?${params.toString()}`);
    }, 1500);
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
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">PimPay Secure Protocol</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* SÉLECTEUR DE COMPTE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Source des fonds</label>
            <div className="relative">
              <button
                disabled={isSubmitting}
                onClick={() => setShowWalletPicker(!showWalletPicker)}
                className="w-full bg-slate-900/80 border border-white/5 rounded-[22px] p-4 flex items-center justify-between hover:border-white/20 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
                    <WalletIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">{selectedCurrency}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{currentWallet.balance.toLocaleString()} disponible</p>
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
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold uppercase">
                        {w.currency.slice(0, 2)}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-xs font-black uppercase">{w.currency}</p>
                        <p className="text-[9px] text-slate-500">{w.balance.toLocaleString()}</p>
                      </div>
                      {selectedCurrency === w.currency && <CheckCircle2 size={16} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RECHERCHE ET SCAN */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Bénéficiaire</label>
            <div className="relative">
              <input
                disabled={isSubmitting}
                type="text"
                placeholder="Pseudo ou adresse crypto..."
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-[22px] p-5 pl-14 text-sm text-white focus:border-blue-500 outline-none transition-all disabled:opacity-50"
              />
              <Search className="absolute left-5 top-5 text-slate-500" size={20} />
              <button 
                onClick={handleScanClick}
                className="absolute right-4 top-3.5 p-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Scan size={18} />
              </button>
            </div>

            {isSearching && (
              <div className="text-[10px] text-blue-400 font-bold uppercase px-4 flex gap-2 items-center">
                <Loader2 className="animate-spin" size={12}/> Cryptage du canal de transfert...
              </div>
            )}

            {recipientData && (
              <div className={`mx-2 flex items-center gap-4 p-4 border rounded-[24px] animate-in fade-in slide-in-from-top-2 ${recipientData.isExternal ? 'bg-slate-800/40 border-slate-700' : 'bg-blue-600/10 border-blue-600/20'}`}>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    src={recipientData.avatar}
                    alt="Avatar"
                    className="w-full h-full rounded-full border-2 border-blue-500/30 object-cover"
                  />
                  {!recipientData.isExternal && (
                    <div className="absolute -bottom-1 -right-1 bg-[#020617] p-0.5 rounded-full">
                      <ShieldCheck className="text-blue-500" size={14} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">{recipientData.firstName} {recipientData.lastName}</p>
                  <p className="text-[9px] text-blue-400 uppercase font-black tracking-widest">
                    @{recipientData.username || 'user'} • {recipientData.isExternal ? 'Réseau Externe' : 'Compte Certifié'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* INPUT MONTANT */}
          <div className="space-y-6 pt-4">
            <div className="relative">
              <input
                disabled={isSubmitting}
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent p-2 text-5xl font-black outline-none text-center text-white placeholder:text-white/5 transition-all"
              />
              <span className="block text-center text-blue-500 font-black italic text-sm uppercase tracking-[0.4em] mt-2">
                {selectedCurrency}
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Note de transfert</label>
              <input
                disabled={isSubmitting}
                type="text"
                placeholder="Motif (ex: Paiement facture)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900/40 border border-white/5 rounded-[20px] p-5 text-sm text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
              />
            </div>

            {/* BOUTON D'ACTION AVEC ANIMATION */}
            <button
              disabled={isSubmitting || !amount || !recipientId}
              onClick={handleGoToSummary}
              className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all shadow-2xl ${
                isSubmitting 
                ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span className="font-black uppercase tracking-widest text-xs italic">Sécurisation du flux PimPay...</span>
                </>
              ) : (
                <>
                  <span className="font-black uppercase tracking-widest text-sm">Continuer l'envoi</span>
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
