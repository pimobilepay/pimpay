"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, CreditCard, ShieldCheck,
  Lock, Eye, EyeOff, Settings,
  Plus, History, Info, Sparkles,
  ChevronRight, Copy, CheckCircle2,
  Zap, Ban, Globe, Wifi, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Wallet,
  DollarSign, Activity, Fingerprint, Loader2, Euro
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Fixed rate for USD->EUR conversion display
const USD_TO_EUR = 0.92;

interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
  brand: string;
  type: string;
  isFrozen: boolean;
  dailyLimit: number;
  totalSpent: number;
  allowedCurrencies: string[];
}

interface WalletData {
  currency: string;
  balance: number;
}

const CARD_LOGS = [
  { id: 1, merchant: "Netflix", amount: "-15.99", date: "Aujourd'hui, 20:01", type: "debit", status: "success", category: "Streaming" },
  { id: 2, merchant: "Amazon", amount: "-124.50", date: "Hier, 12:30", type: "debit", status: "success", category: "E-commerce" },
  { id: 3, merchant: "Recharge +250.00", amount: "+250.00", date: "15 Fev, 09:15", type: "credit", status: "success", category: "Top-up" },
  { id: 4, merchant: "Apple Store", amount: "-2.99", date: "14 Fev, 14:20", type: "debit", status: "success", category: "Apps" },
  { id: 5, merchant: "Spotify", amount: "-9.99", date: "10 Fev, 08:00", type: "debit", status: "success", category: "Streaming" },
  { id: 6, merchant: "Uber Eats", amount: "-18.75", date: "8 Fev, 21:30", type: "debit", status: "pending", category: "Food" },
];

function formatCardNumber(num: string): string {
  const clean = num.replace(/\s/g, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

function maskCardNumber(num: string): string {
  const clean = num.replace(/\s/g, "");
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export default function McardPage() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "history" | "settings">("info");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [balanceCurrency, setBalanceCurrency] = useState<"USD" | "EUR">("USD");
  const [noCard, setNoCard] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch card data and wallet balances in parallel
        const [profileRes, balanceRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/wallet/balance"),
        ]);

        const profileData = await profileRes.json();
        const balanceData = await balanceRes.json();

        // Extract wallets from profile
        if (profileData.success && profileData.user) {
          const userWallets = profileData.user.wallets || [];
          setWallets(userWallets);

          // Extract card info from virtualCards
          const cards = profileData.user.virtualCards;
          if (cards && cards.length > 0) {
            const card = cards[0];
            setCardData({
              number: card.number || "",
              expiry: card.exp || "",
              cvv: card.cvv || "",
              holder: card.holder || "PIONEER",
              brand: card.brand || "MASTERCARD",
              type: card.type || "CLASSIC",
              isFrozen: card.isFrozen || false,
              dailyLimit: card.dailyLimit || 1000,
              totalSpent: card.totalSpent || 0,
              allowedCurrencies: card.allowedCurrencies || ["USD", "EUR"],
            });
            setIsFrozen(card.isFrozen || false);
          } else {
            setNoCard(true);
          }
        } else {
          // Fallback: try balance data for wallets
          if (balanceData.wallets) {
            setWallets(balanceData.wallets);
          }
          setNoCard(true);
        }
      } catch (err) {
        console.error("Erreur chargement carte:", err);
        setNoCard(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    setCopied(label);
    toast.success(`${label} copie !`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Compute total balance from user wallets (sum of USDT, USDC, DAI, BUSD, XAF converted)
  const getUsdBalance = (): number => {
    let total = 0;
    for (const w of wallets) {
      if (["USDT", "USD", "USDC", "DAI", "BUSD"].includes(w.currency)) {
        total += w.balance;
      } else if (w.currency === "XAF") {
        total += w.balance / 655.957; // XAF to EUR to USD approx
      }
    }
    return total;
  };

  const usdBalance = getUsdBalance();
  const eurBalance = usdBalance * USD_TO_EUR;
  const displayBalance = balanceCurrency === "USD" ? usdBalance : eurBalance;
  const displaySymbol = balanceCurrency === "USD" ? "$" : "\u20AC";

  // Card display values
  const cardNumber = cardData?.number || "";
  const formattedNumber = formatCardNumber(cardNumber);
  const maskedNumber = maskCardNumber(cardNumber);
  const last4 = cardNumber.replace(/\s/g, "").slice(-4);
  const cardExpiry = cardData?.expiry || "";
  const cardCvv = cardData?.cvv || "";
  const cardHolder = cardData?.holder || "PIONEER";
  const cardBrand = cardData?.brand || "MASTERCARD";
  const cardType = cardData?.type || "CLASSIC";
  const dailyLimit = cardData?.dailyLimit || 1000;
  const monthlyLimit = dailyLimit * 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (noCard) {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
        <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">M-Card</h1>
          </div>
          <div className="w-11" />
        </header>
        <main className="px-6 pt-16 pb-32 flex flex-col items-center gap-6">
          <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-full">
            <CreditCard size={48} className="text-blue-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight">Aucune carte</h2>
            <p className="text-sm text-slate-400 font-bold">Commandez votre carte virtuelle PimPay pour commencer.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/card/order")}
            className="w-full max-w-sm bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Plus size={20} />
            Commander une carte
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">

      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter">M-Card</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isFrozen ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[2px]">
              {isFrozen ? "Carte Gelee" : "Carte Active"}
            </p>
          </div>
        </div>
        <button onClick={() => setActiveTab("settings")} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <Settings size={20} />
        </button>
      </header>

      <main className="px-6 pt-8 pb-32 space-y-8">

        {/* VIRTUAL CARD WITH FLIP */}
        <section className="relative">
          <div className="relative w-full" style={{ perspective: "1200px" }}>
            <div
              className={`relative w-full aspect-[1.586/1] transition-transform duration-700 ease-in-out`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT */}
              <div
                className={`absolute inset-0 w-full h-full rounded-[1.5rem] p-6 overflow-hidden ${isFrozen ? "grayscale opacity-60" : "shadow-2xl shadow-blue-600/20"}`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 rounded-[1.5rem] overflow-hidden">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full -ml-20 -mb-20 blur-3xl" />
                  <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-indigo-400/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                </div>

                <div className="h-full flex flex-col justify-between relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">PimPay Virtual</p>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-400 fill-amber-400" />
                        <span className="font-black italic tracking-tighter text-lg">M-CARD</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi size={18} className="text-white/40 rotate-90" />
                      <Globe size={20} className="text-white/30" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-9 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md">
                      <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="bg-black/20 rounded-[1px]" />
                        ))}
                      </div>
                    </div>
                    <Wifi size={20} className="rotate-90 text-white/40" />
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => copyToClipboard(cardNumber, "Numero")}
                      className="flex items-center gap-2 group"
                    >
                      <p className="text-xl md:text-2xl font-black tracking-[0.2em] font-mono">
                        {showDetails ? formattedNumber : maskedNumber}
                      </p>
                      <Copy size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    </button>

                    <div className="flex gap-8">
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase mb-0.5">{"Valide jusqu'au"}</p>
                        <p className="text-sm font-black tracking-widest">{showDetails ? cardExpiry : "••/••"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase mb-0.5">CVV</p>
                        <p className="text-sm font-black tracking-widest">{showDetails ? cardCvv : "•••"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase mb-0.5">Type</p>
                        <p className="text-sm font-black tracking-widest">DEBIT</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">{cardHolder}</p>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#eb001b]/80" />
                      <div className="w-8 h-8 rounded-full bg-[#f79e1b]/80 -ml-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* BACK */}
              <div
                className={`absolute inset-0 w-full h-full rounded-[1.5rem] overflow-hidden ${isFrozen ? "grayscale opacity-60" : "shadow-2xl shadow-blue-600/20"}`}
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 rounded-[1.5rem]" />

                <div className="relative h-full z-10">
                  <div className="w-full h-12 bg-black/80 mt-6" />

                  <div className="p-6 flex flex-col justify-between" style={{ height: "calc(100% - 4.5rem)" }}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-10 bg-white/90 rounded flex items-center justify-end px-4">
                          <span className="text-slate-900 font-mono font-black text-lg tracking-widest">{cardCvv}</span>
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Code de securite CVV2</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-white/50">
                        <span>Numero complet</span>
                        <span className="font-mono text-white/70">{formattedNumber}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/50">
                        <span>Titulaire</span>
                        <span className="text-white/70 uppercase">{cardHolder}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/50">
                        <span>Expiration</span>
                        <span className="text-white/70">{cardExpiry}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/50">
                        <span>Emetteur</span>
                        <span className="text-white/70">PimPay Financial Services</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[7px] text-white/20">{"Propriete de PimPay. Usage personnel uniquement."}</p>
                      <div className="flex items-center opacity-50">
                        <div className="w-5 h-5 rounded-full bg-[#eb001b]/80" />
                        <div className="w-5 h-5 rounded-full bg-[#f79e1b]/80 -ml-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Actions Below */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
            >
              {showDetails ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="text-[9px] font-black uppercase tracking-widest">
                {showDetails ? "Masquer" : "Reveler"}
              </span>
            </button>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
            >
              <RefreshCw size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {isFlipped ? "Recto" : "Verso"}
              </span>
            </button>
            <button
              onClick={() => copyToClipboard(cardNumber, "Numero")}
              className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
            >
              {copied === "Numero" ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="text-[9px] font-black uppercase tracking-widest">Copier</span>
            </button>
          </div>
        </section>

        {/* BALANCE BAR - Dual Currency */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Wallet size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Solde Carte</p>
                  <p className="text-lg font-black tracking-tight">
                    {displaySymbol}{displayBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs text-slate-500 font-bold ml-1">{balanceCurrency}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBalanceCurrency(balanceCurrency === "USD" ? "EUR" : "USD")}
                  className="bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition-all active:scale-90"
                  title="Changer de devise"
                >
                  {balanceCurrency === "USD" ? <Euro size={16} className="text-blue-400" /> : <DollarSign size={16} className="text-blue-400" />}
                </button>
                <button
                  onClick={() => router.push("/dashboard/card/order")}
                  className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-90"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>
            </div>
            {/* Secondary currency display */}
            <div className="mt-2 ml-14 pl-0.5">
              <p className="text-[10px] text-slate-600 font-bold">
                {"~"}{balanceCurrency === "USD" ? "\u20AC" : "$"}
                {(balanceCurrency === "USD" ? eurBalance : usdBalance).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1">{balanceCurrency === "USD" ? "EUR" : "USD"}</span>
              </p>
            </div>
          </div>
        </section>

        {/* TABS */}
        <section>
          <div className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5">
            {[
              { id: "info" as const, label: "Informations" },
              { id: "history" as const, label: "Historique" },
              { id: "settings" as const, label: "Gestion" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* TAB: INFORMATIONS */}
        {activeTab === "info" && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Full Card Details */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
              {[
                { label: "Numero de carte", value: showDetails ? formattedNumber : `•••• •••• •••• ${last4}`, copyable: true, copyVal: cardNumber },
                { label: "Titulaire", value: cardHolder },
                { label: "Date d'expiration", value: showDetails ? cardExpiry : "••/••" },
                { label: "CVV / CVC", value: showDetails ? cardCvv : "•••" },
                { label: "Type de carte", value: `${cardBrand} ${cardType}` },
                { label: "Reseau", value: `${cardBrand} Worldwide` },
                { label: "Emetteur", value: "PimPay Financial Services" },
                { label: "Devises", value: "USD / EUR" },
                { label: "Securite", value: "3D Secure 2.0" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white text-right max-w-[180px] truncate">{row.value}</span>
                    {row.copyable && (
                      <button
                        onClick={() => copyToClipboard(row.copyVal!, row.label)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-all"
                      >
                        {copied === row.label ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-600" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Limits */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Limites de la carte</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Limite journaliere</p>
                  <p className="text-lg font-black text-white">${dailyLimit.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-600 font-bold">{"\u20AC"}{(dailyLimit * USD_TO_EUR).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Limite mensuelle</p>
                  <p className="text-lg font-black text-white">${monthlyLimit.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-600 font-bold">{"\u20AC"}{(monthlyLimit * USD_TO_EUR).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Info size={18} className="text-blue-400" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">Securite avancee</h2>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 font-bold">
                Votre <span className="text-white">M-Card</span> est protegee par le protocole <span className="text-blue-400">3D Secure 2.0</span>. Ne partagez jamais votre CVV, PIN ou numero complet. En cas de compromission, utilisez immediatement le bouton <span className="text-red-400">{'"Geler"'}</span> ci-dessous.
              </p>
            </div>
          </section>
        )}

        {/* TAB: HISTORY */}
        {activeTab === "history" && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={14} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Transactions recentes</h2>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
              {CARD_LOGS.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === "credit" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {log.type === "credit" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight truncate">{log.merchant}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-bold text-slate-600">{log.date}</p>
                      <span className="text-[7px] font-black text-slate-700 bg-white/5 px-1.5 py-0.5 rounded-full uppercase">{log.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${log.type === "credit" ? "text-emerald-400" : "text-white"}`}>
                      {log.amount} $
                    </p>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${log.status === "success" ? "text-emerald-500/60" : "text-amber-500/60"}`}>
                      {log.status === "success" ? "Confirme" : "En cours"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === "settings" && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setIsFrozen(!isFrozen);
                  toast(isFrozen ? "Carte debloquee !" : "Carte gelee par securite.");
                }}
                className={`p-4 rounded-[2rem] border flex flex-col items-center gap-3 transition-all active:scale-90 ${isFrozen ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {isFrozen ? <CheckCircle2 size={22} /> : <Ban size={22} />}
                <span className="text-[8px] font-black uppercase tracking-widest">{isFrozen ? "Activer" : "Geler"}</span>
              </button>

              <button className="p-4 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-3 text-slate-400 hover:bg-white/10 transition-all active:scale-90">
                <Lock size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">PIN</span>
              </button>

              <button className="p-4 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-3 text-slate-400 hover:bg-white/10 transition-all active:scale-90">
                <Fingerprint size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">Biometrie</span>
              </button>
            </div>

            {/* Toggles */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
              {[
                { label: "Paiements en ligne", description: "Achats sur internet", enabled: true, icon: Globe },
                { label: "Sans contact (NFC)", description: "Paiements contactless", enabled: true, icon: Wifi },
                { label: "Retraits DAB", description: "Retrait aux distributeurs", enabled: false, icon: DollarSign },
              ].map((option, i) => (
                <div key={i} className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <option.icon size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{option.label}</p>
                      <p className="text-[9px] font-bold text-slate-600">{option.description}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-all ${option.enabled ? "bg-blue-600" : "bg-white/10"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${option.enabled ? "right-1" : "left-1"}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Order New Card */}
            <button
              onClick={() => router.push("/dashboard/card/order")}
              className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Plus size={20} />
              Commander une nouvelle carte
            </button>

            {/* Physical Card Promo */}
            <div className="relative overflow-hidden rounded-[2rem] p-8 border border-white/5 bg-slate-900/60">
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2 italic">Carte physique PimPay</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">Bientot disponible pour les pionniers certifies KYC.</p>
                <button className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-[3px]">
                  {"S'inscrire sur la liste"} <ChevronRight size={14} />
                </button>
              </div>
              <CreditCard size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
            </div>
          </section>
        )}
      </main>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">Protocole M-Card Actif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
