"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCcw,
  CreditCard,
  ArrowDownToLine,
  PlusCircle,
  MinusCircle,
  Zap,
  ChevronDown,
  History,
  Eye,
  EyeOff,
  ShieldCheck,
  Wifi,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Wallet,
  Globe,
  Lock,
  ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const CURRENCY_RATES = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  CDF: 2800
};

type CurrencyKey = keyof typeof CURRENCY_RATES;

export default function CardPage() {
  const [data, setData] = useState<any>(null);
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [showPicker, setShowPicker] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    try {
      const profileRes = await fetch("/api/user/profile");
      const profileData = await profileRes.json();

      if (profileData.success) {
        setData(profileData);
        if (profileData.virtualCards && profileData.virtualCards.length > 0) {
          setCardData(profileData.virtualCards[0]);
        } else {
          setCardData(null);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoToOrder = () => {
    router.push("/dashboard/card/order");
  };

  const getFiatBalance = (curr: string) => {
    const wallet = data?.wallets?.find((w: any) => w.currency === curr);
    return wallet ? wallet.balance : 0;
  };

  // Détection du type de carte
  const isVisa = cardData?.brand?.toLowerCase() === 'visa';
  const isMasterCard = cardData?.brand?.toLowerCase() === 'mastercard';

  // Gradients selon le type de carte
  const getCardGradient = () => {
    if (!cardData) return 'from-[#1a2b3c] to-[#0f172a]';
    if (isVisa) return 'from-[#1a1f71] via-[#2d3a8c] to-[#0d1137]';
    if (isMasterCard) return 'from-[#eb001b] via-[#c41230] to-[#ff5f00]';
    return 'from-[#1a2b3c] to-[#0f172a]';
  };

  const getBackGradient = () => {
    if (!cardData) return 'from-[#0f172a] to-[#1a2b3c]';
    if (isVisa) return 'from-[#0d1137] via-[#1a1f71] to-[#2d3a8c]';
    if (isMasterCard) return 'from-[#ff5f00] via-[#c41230] to-[#eb001b]';
    return 'from-[#0f172a] to-[#1a2b3c]';
  };

  // Logo Visa
  const VisaLogo = () => (
    <span className="text-2xl font-black italic text-white tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
      VISA
    </span>
  );

  // Logo MasterCard
  const MasterCardLogo = () => (
    <div className="flex items-center">
      <div className="w-8 h-8 bg-[#eb001b] rounded-full"></div>
      <div className="w-8 h-8 bg-[#ff5f00] rounded-full -ml-3 opacity-90"></div>
    </div>
  );

  const renderLogo = () => {
    if (isVisa) return <VisaLogo />;
    if (isMasterCard) return <MasterCardLogo />;
    return (
      <div className="flex">
        <div className="w-8 h-8 bg-[#eb001b] rounded-full"></div>
        <div className="w-8 h-8 bg-[#ff5f00] rounded-full -ml-3 mix-blend-screen"></div>
      </div>
    );
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardData) {
      setIsFlipped(!isFlipped);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <Loader2 className="w-12 h-12 text-white animate-spin relative z-10" />
        </div>
        <span className="text-white/60 text-sm font-medium tracking-wider">Chargement...</span>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#030014] text-white pb-32 font-sans relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[150px]"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <header className="max-w-md mx-auto pt-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur-lg opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">
                  PIMPAY<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">CARD</span>
                </h1>
                <p className="text-[10px] text-white/40 font-medium tracking-wider">WEB3 FINANCE</p>
              </div>
            </div>
            <button 
              onClick={() => fetchData()} 
              className="group p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              <RefreshCcw size={18} className="text-white/70 group-hover:text-purple-400 transition-colors" />
            </button>
          </div>

          {/* Stats Banner */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/50 font-medium">Portfolio Total</p>
                  <p className="text-lg font-bold">{getFiatBalance(currency).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-white/50 text-sm">{currency}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
                <ArrowUpRight size={12} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">+12.5%</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-md mx-auto space-y-6">

          {/* CARTE VIRTUELLE AVEC FLIP 3D */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-[32px] blur-2xl transform scale-95"></div>
            
            <div 
              className="relative w-full aspect-[1.58/1]" 
              style={{ perspective: '1000px' }}
            >
              <div 
                className="relative w-full h-full transition-transform duration-700 ease-in-out"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* FACE AVANT */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-[24px] overflow-hidden shadow-2xl cursor-pointer ${!cardData ? 'grayscale opacity-50' : ''}`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getCardGradient()}`}>
                    {/* Motifs de fond Visa */}
                    {isVisa && (
                      <>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#f7b924]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#f7b924]/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
                      </>
                    )}
                    {/* Motifs de fond MasterCard */}
                    {isMasterCard && (
                      <>
                        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#ff5f00]/30 to-transparent rounded-full -translate-y-1/3 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-[#eb001b]/20 to-transparent rounded-full translate-y-1/3 -translate-x-1/3"></div>
                      </>
                    )}
                    {/* Motifs par défaut - Web3 style */}
                    {!isVisa && !isMasterCard && (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
                      </>
                    )}
                  </div>

                  <div className="relative z-10 h-full p-6 flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isVisa ? 'text-[#f7b924]' : isMasterCard ? 'text-white/60' : 'text-purple-400'}`}>
                          <ShieldCheck size={10} /> Balance Disponible
                        </span>
                        <span className="text-lg font-bold tracking-tight text-white/90">
                          {getFiatBalance(currency).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                            className={`flex items-center gap-1 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-bold border ${isVisa ? 'bg-[#f7b924]/20 border-[#f7b924]/30' : isMasterCard ? 'bg-white/10 border-white/20' : 'bg-purple-500/20 border-purple-500/30'}`}
                          >
                            {currency} <ChevronDown size={10} />
                          </button>
                          {showPicker && (
                            <div className="absolute top-full right-0 mt-1 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                              {Object.keys(CURRENCY_RATES).map((curr) => (
                                <button
                                  key={curr}
                                  className="block w-full px-4 py-2 text-[10px] hover:bg-purple-500/20 text-left transition-colors"
                                  onClick={(e) => { e.stopPropagation(); setCurrency(curr as CurrencyKey); setShowPicker(false); }}
                                >
                                  {curr}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Bouton Flip pour voir CVV */}
                        <button
                          onClick={handleFlip}
                          className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${isVisa ? 'hover:bg-[#f7b924]/20' : isMasterCard ? 'hover:bg-white/20' : 'hover:bg-purple-500/20'}`}
                          title="Voir le CVV"
                        >
                          <Eye size={16} className="text-white/70" />
                        </button>
                      </div>
                    </div>

                    {/* Puce et Contactless */}
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-8 rounded-md ${isVisa ? 'bg-gradient-to-br from-[#f7b924] to-[#d4a017]' : isMasterCard ? 'bg-gradient-to-br from-[#ffd700] to-[#daa520]' : 'bg-gradient-to-br from-purple-400 to-cyan-400'}`}>
                        <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-black/20 rounded-[1px]"></div>
                          ))}
                        </div>
                      </div>
                      <Wifi size={20} className="rotate-90 text-white/40" />
                    </div>

                    {/* Numéro de carte */}
                    <div className="flex flex-col gap-1">
                      <p className="text-xl font-mono tracking-[0.2em] text-white">
                        {cardData?.number
                          ? `•••• •••• •••• ${cardData.number.slice(-4)}`
                          : "•••• •••• •••• ••••"}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className={`text-[10px] font-medium tracking-wide uppercase ${isVisa ? 'text-white/90' : 'text-white/80'}`}>
                          {cardData?.holder || data?.name || data?.username || "AWAITING CARD"}
                        </p>
                        <div className="flex flex-col items-end">
                          <span className={`text-[6px] uppercase font-bold ${isVisa ? 'text-[#f7b924]/70' : isMasterCard ? 'text-white/50' : 'text-purple-400/70'}`}>Expire fin</span>
                          <span className="text-[10px] font-mono">{cardData?.exp || "--/--"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logo en bas à droite */}
                    <div className="absolute bottom-6 right-6">
                      {renderLogo()}
                    </div>

                    {/* Hologramme Visa */}
                    {isVisa && cardData && (
                      <div className="absolute bottom-16 right-6 w-10 h-6 bg-gradient-to-r from-[#f7b924]/40 via-[#c0c0c0]/30 to-[#f7b924]/40 rounded animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* FACE ARRIÈRE (CVV) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-[24px] overflow-hidden shadow-2xl ${!cardData ? 'grayscale opacity-50' : ''}`}
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getBackGradient()}`}></div>
                  
                  {/* Bande magnétique */}
                  <div className="relative z-10 h-full">
                    <div className="w-full h-12 bg-black/80 mt-6"></div>
                    
                    <div className="p-6 flex flex-col justify-between h-[calc(100%-4.5rem)]">
                      {/* Zone de signature avec CVV */}
                      <div className="mt-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-10 bg-white/90 rounded flex items-center justify-end px-3">
                            <div className="bg-white px-3 py-1 border-l-2 border-gray-300">
                              <span className="text-black font-mono font-bold text-xl tracking-widest">
                                {cardData?.cvv || '***'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className={`text-[9px] mt-2 uppercase tracking-wider ${isVisa ? 'text-[#f7b924]/70' : isMasterCard ? 'text-white/50' : 'text-purple-400/70'}`}>
                          Code de sécurité (CVV)
                        </p>
                      </div>

                      {/* Informations complètes */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-white/60">
                          <span>Numéro complet:</span>
                          <span className="font-mono tracking-wider">{cardData?.number?.replace(/(\d{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/60">
                          <span>Titulaire:</span>
                          <span className="uppercase">{cardData?.holder || data?.name || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/60">
                          <span>Expiration:</span>
                          <span>{cardData?.exp || '--/--'}</span>
                        </div>
                      </div>

                      {/* Bouton retour et logo */}
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={handleFlip}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 ${isVisa ? 'bg-[#f7b924]/20 hover:bg-[#f7b924]/30' : isMasterCard ? 'bg-white/10 hover:bg-white/20' : 'bg-purple-500/20 hover:bg-purple-500/30'}`}
                        >
                          <EyeOff size={14} />
                          <span className="text-[10px] font-medium">Masquer</span>
                        </button>
                        
                        <div className="opacity-50 scale-75">
                          {renderLogo()}
                        </div>
                      </div>
                    </div>

                    {/* Texte légal */}
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="text-[7px] text-white/30 px-4">
                        Cette carte est la propriété de Pimpay. Usage personnel uniquement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS RAPIDES - Web3 Style */}
          <div className="grid grid-cols-3 gap-3">
            <button className="group flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] hover:border-purple-500/50 hover:bg-purple-500/5 active:scale-95 transition-all duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                  <PlusCircle size={22} className="text-white" />
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase text-white/50 group-hover:text-purple-400 transition-colors tracking-wider">Recharger</span>
            </button>

            <button
              onClick={handleGoToOrder}
              className="group flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] hover:border-cyan-500/50 hover:bg-cyan-500/5 active:scale-95 transition-all duration-300"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
                <div className={`relative w-12 h-12 ${!cardData ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-cyan-500 to-cyan-700'} rounded-full flex items-center justify-center`}>
                  <CreditCard size={22} className="text-white" />
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase text-white/50 group-hover:text-cyan-400 transition-colors tracking-wider">Commander</span>
            </button>

            <button className="group flex flex-col items-center justify-center gap-3 p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] hover:border-pink-500/50 hover:bg-pink-500/5 active:scale-95 transition-all duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-pink-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center">
                  <MinusCircle size={22} className="text-white" />
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase text-white/50 group-hover:text-pink-400 transition-colors tracking-wider">Retrait</span>
            </button>
          </div>

          {/* Features Banner */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500/10 to-purple-500/5 backdrop-blur-xl rounded-2xl border border-purple-500/20">
              <Globe size={16} className="text-purple-400" />
              <span className="text-[10px] font-medium text-white/70 whitespace-nowrap">Paiements Globaux</span>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 backdrop-blur-xl rounded-2xl border border-cyan-500/20">
              <Lock size={16} className="text-cyan-400" />
              <span className="text-[10px] font-medium text-white/70 whitespace-nowrap">Sécurité Web3</span>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500/10 to-pink-500/5 backdrop-blur-xl rounded-2xl border border-pink-500/20">
              <Sparkles size={16} className="text-pink-400" />
              <span className="text-[10px] font-medium text-white/70 whitespace-nowrap">Cashback Crypto</span>
            </div>
          </div>

          {/* LISTE DES SOLDES - Web3 Style */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Comptes Fiat</h3>
              <button className="text-[10px] text-white/40 hover:text-purple-400 transition-colors flex items-center gap-1">
                Voir tout <ChevronRight size={12} />
              </button>
            </div>
            {data?.wallets?.filter((w: any) => w.currency !== 'PI').map((wallet: any) => (
              <div
                key={wallet.id}
                onClick={() => setCurrency(wallet.currency as CurrencyKey)}
                className={`group p-5 rounded-[20px] border backdrop-blur-xl transition-all duration-300 cursor-pointer flex items-center justify-between ${currency === wallet.currency ? 'bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs transition-all ${currency === wallet.currency ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/5 text-white/50 group-hover:bg-white/10'}`}>
                    {wallet.currency.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{wallet.currency}</p>
                    <p className="text-[10px] text-white/40 font-medium tracking-wider">DISPONIBLE</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{wallet.balance.toLocaleString()} <span className="text-white/50">{wallet.currency}</span></p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-[9px] text-emerald-400 font-medium">Vérifié</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DERNIÈRES TRANSACTIONS - Web3 Style */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Activités Récentes</h3>
              <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <History size={14} className="text-white/50" />
              </button>
            </div>
            <div className="space-y-3">
              {data?.transactions?.length > 0 ? (
                data.transactions.slice(0, 6).map((tx: any) => (
                  <div key={tx.id} className="group p-4 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[18px] hover:border-white/10 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${tx.flow === 'IN' ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-purple-500/10 group-hover:bg-purple-500/20'}`}>
                        {tx.flow === 'IN' ? <ArrowDownToLine size={18} className="text-emerald-400" /> : <Zap size={18} className="text-purple-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{tx.description || "Transaction"}</p>
                        <p className="text-[10px] text-white/40 font-medium">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tracking-tight ${tx.flow === 'IN' ? 'text-emerald-400' : 'text-white'}`}>
                        {tx.flow === 'IN' ? '+' : '-'} {tx.amount.toLocaleString()} <span className="text-white/50 text-xs">{tx.currency || 'π'}</span>
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500' : tx.status === 'PENDING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <p className="text-[8px] text-white/40 uppercase font-bold tracking-wider">{tx.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-[24px] bg-white/[0.01]">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
                    <History size={24} className="text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-white/30">Aucune activité</p>
                  <p className="text-[10px] text-white/20 mt-1">Vos transactions apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
