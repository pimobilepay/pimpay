"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, CreditCard, ShieldCheck,
  Lock, Eye, EyeOff, Settings,
  Plus, History, Info,
  ChevronRight, Copy, CheckCircle2,
  Ban, Wifi, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Wallet,
  DollarSign, Activity, Fingerprint, Loader2, Euro, Globe,
  X, AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Fixed rate for USD->EUR conversion display
const USD_TO_EUR = 0.92;

interface CardData {
  id: string;
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
  balanceUSD: number;
  balanceEUR: number;
}

interface WalletData {
  currency: string;
  balance: number;
}

// Get card balance from CARD_USD and CARD_EUR wallets
interface CardBalanceData {
  USD: number;
  EUR: number;
}



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
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [balanceCurrency, setBalanceCurrency] = useState<"USD" | "EUR">("USD");
  const [noCard, setNoCard] = useState(false);
  const [cardTransactions, setCardTransactions] = useState<{
    id: string;
    merchant: string;
    amount: string;
    date: string;
    type: "debit" | "credit";
    status: "success" | "pending" | "failed";
    category: string;
    currency: string;
    reference?: string;
    fee?: number;
    metadata?: Record<string, unknown>;
  }[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [cardBalance, setCardBalance] = useState<CardBalanceData>({ USD: 0, EUR: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    merchant: string;
    amount: string;
    date: string;
    type: "debit" | "credit";
    status: "success" | "pending" | "failed";
    category: string;
    currency: string;
    reference?: string;
    fee?: number;
    metadata?: Record<string, unknown>;
  } | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  
  // Recharge & Withdraw Modal States
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeCurrency, setRechargeCurrency] = useState<"USD" | "EUR">("USD");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"USD" | "EUR">("USD");
  const [processingRecharge, setProcessingRecharge] = useState(false);
  const [processingWithdraw, setProcessingWithdraw] = useState(false);

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
          
          // Extract card info from virtualCards (each card has its own balance)
          const cards = profileData.user.virtualCards;
          if (cards && cards.length > 0) {
            // Store all cards for later switching - each card has its own balance
            const mappedCards: CardData[] = cards.map((c: { 
              id: string; 
              number?: string; 
              exp?: string; 
              cvv?: string; 
              holder?: string; 
              brand?: string; 
              type?: string; 
              isFrozen?: boolean; 
              dailyLimit?: number; 
              totalSpent?: number; 
              allowedCurrencies?: string[];
              balanceUSD?: number;
              balanceEUR?: number;
            }) => ({
              id: c.id,
              number: c.number || "",
              expiry: c.exp || "",
              cvv: c.cvv || "",
              holder: c.holder || "PIONEER",
              brand: c.brand || "MASTERCARD",
              type: c.type || "VIRTUAL",
              isFrozen: c.isFrozen || false,
              dailyLimit: c.dailyLimit || 1000,
              totalSpent: c.totalSpent || 0,
              allowedCurrencies: c.allowedCurrencies || ["USD", "EUR"],
              balanceUSD: c.balanceUSD || 0,
              balanceEUR: c.balanceEUR || 0,
            }));
            setAllCards(mappedCards);

            // Get URL search params for card id
            const urlParams = new URLSearchParams(window.location.search);
            const urlCardId = urlParams.get("id");
            
            // Check for primary card in localStorage
            const primaryCardId = localStorage.getItem("pimpay_primary_card");
            
            // Find the card to display: URL param > localStorage > first card
            let selectedCard = mappedCards[0];
            if (urlCardId) {
              const foundCard = mappedCards.find((c) => c.id === urlCardId);
              if (foundCard) selectedCard = foundCard;
            } else if (primaryCardId) {
              const foundCard = mappedCards.find((c) => c.id === primaryCardId);
              if (foundCard) selectedCard = foundCard;
            }
            
            setCardData(selectedCard);
            setIsFrozen(selectedCard.isFrozen || false);
            // Set card balance from selected card
            setCardBalance({
              USD: selectedCard.balanceUSD || 0,
              EUR: selectedCard.balanceEUR || 0,
            });
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

  // Fetch card transactions when history tab is active
  useEffect(() => {
    const fetchCardTransactions = async () => {
      if (activeTab !== "history" || !cardData?.id) return;
      
      setLoadingTransactions(true);
      try {
        const res = await fetch(`/api/cards/transactions?cardId=${cardData.id}`);
        const data = await res.json();
        if (data.success && data.transactions) {
          setCardTransactions(data.transactions);
        }
      } catch (err) {
        console.error("Erreur chargement transactions:", err);
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchCardTransactions();
  }, [activeTab, cardData?.id]);

  // Listen for localStorage changes to switch cards
  useEffect(() => {
    const handleStorageChange = () => {
      const primaryCardId = localStorage.getItem("pimpay_primary_card");
      if (primaryCardId && allCards.length > 0) {
        const foundCard = allCards.find((c) => c.id === primaryCardId);
        if (foundCard && foundCard.id !== cardData?.id) {
          setCardData(foundCard);
          setIsFrozen(foundCard.isFrozen || false);
          setCardTransactions([]);
          // Update card balance from new card
          setCardBalance({
            USD: foundCard.balanceUSD || 0,
            EUR: foundCard.balanceEUR || 0,
          });
        }
      }
    };

    // Check on mount/update
    handleStorageChange();

    // Listen for storage events from other tabs
    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-tab updates
    window.addEventListener("pimpay_card_changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pimpay_card_changed", handleStorageChange);
    };
  }, [allCards, cardData?.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    setCopied(label);
    toast.success(`${label} copie !`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Get specific wallet balance
  const getWalletBalance = (currency: string): number => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  // Handle card recharge
  const handleRecharge = async () => {
    if (!cardData?.id || !rechargeAmount) return;
    
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    const available = getWalletBalance(rechargeCurrency);
    if (amount > available) {
      toast.error(`Solde ${rechargeCurrency} insuffisant`);
      return;
    }

    setProcessingRecharge(true);
    try {
      const res = await fetch("/api/user/card/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardData.id,
          amount,
          currency: rechargeCurrency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Recharge de ${data.netAmount.toFixed(2)} ${rechargeCurrency} reussie!`);
        setShowRechargeModal(false);
        setRechargeAmount("");
        // Refresh balances from profile (wallets and card balances)
        const profileRes2 = await fetch("/api/user/profile");
        const profileData2 = await profileRes2.json();
        if (profileData2.success && profileData2.user) {
          const userWallets2 = profileData2.user.wallets || [];
          setWallets(userWallets2);
          
          // Update card balance from the updated card data
          const updatedCards = profileData2.user.virtualCards || [];
          const updatedCard = updatedCards.find((c: { id: string }) => c.id === cardData?.id);
          if (updatedCard) {
            setCardBalance({
              USD: updatedCard.balanceUSD || 0,
              EUR: updatedCard.balanceEUR || 0,
            });
            // Also update cardData with new balance
            setCardData((prev) => prev ? {
              ...prev,
              balanceUSD: updatedCard.balanceUSD || 0,
              balanceEUR: updatedCard.balanceEUR || 0,
            } : null);
          }
        }
        // Refresh transactions if on history tab
        if (activeTab === "history" && cardData?.id) {
          const txRes = await fetch(`/api/cards/transactions?cardId=${cardData.id}`);
          const txData = await txRes.json();
          if (txData.success && txData.transactions) {
            setCardTransactions(txData.transactions);
          }
        }
      } else {
        // Display more detailed error message
        const errorMsg = data.error || "Echec de la recharge";
        const availableMsg = data.available !== undefined ? ` (Disponible: ${data.available.toFixed(2)} ${rechargeCurrency})` : "";
        toast.error(errorMsg + availableMsg);
      }
    } catch (err) {
      console.error("Recharge error:", err);
      toast.error("Erreur lors de la recharge");
    } finally {
      setProcessingRecharge(false);
    }
  };

  // Handle card withdraw
  const handleWithdraw = async () => {
    if (!cardData?.id || !withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    // Card balance check - uses actual card balance
    const availableCardBalance = withdrawCurrency === "USD" ? cardBalance.USD : cardBalance.EUR;
    if (amount > availableCardBalance) {
      toast.error(`Solde carte ${withdrawCurrency} insuffisant (${availableCardBalance.toFixed(2)} ${withdrawCurrency} disponible)`);
      return;
    }

    setProcessingWithdraw(true);
    try {
      const res = await fetch("/api/user/card/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardData.id,
          amount,
          currency: withdrawCurrency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Retrait de ${data.netAmount.toFixed(2)} ${withdrawCurrency} vers compte ${withdrawCurrency} reussi!`);
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        // Refresh balances from profile (wallets and card balances)
        const profileRes3 = await fetch("/api/user/profile");
        const profileData3 = await profileRes3.json();
        if (profileData3.success && profileData3.user) {
          const userWallets3 = profileData3.user.wallets || [];
          setWallets(userWallets3);
          
          // Update card balance from the updated card data
          const updatedCards3 = profileData3.user.virtualCards || [];
          const updatedCard3 = updatedCards3.find((c: { id: string }) => c.id === cardData?.id);
          if (updatedCard3) {
            setCardBalance({
              USD: updatedCard3.balanceUSD || 0,
              EUR: updatedCard3.balanceEUR || 0,
            });
            // Also update cardData with new balance
            setCardData((prev) => prev ? {
              ...prev,
              balanceUSD: updatedCard3.balanceUSD || 0,
              balanceEUR: updatedCard3.balanceEUR || 0,
            } : null);
          }
        }
        // Refresh transactions if on history tab
        if (activeTab === "history" && cardData?.id) {
          const txRes = await fetch(`/api/cards/transactions?cardId=${cardData.id}`);
          const txData = await txRes.json();
          if (txData.success && txData.transactions) {
            setCardTransactions(txData.transactions);
          }
        }
      } else {
        // Display more detailed error message
        const errorMsg = data.error || "Echec du retrait";
        const availableMsg = data.available !== undefined ? ` (Disponible: ${data.available.toFixed(2)} ${withdrawCurrency})` : "";
        toast.error(errorMsg + availableMsg);
      }
    } catch (err) {
      console.error("Withdraw error:", err);
      toast.error("Erreur lors du retrait");
    } finally {
      setProcessingWithdraw(false);
    }
  };

  // Card balances (actual balance on the card)
  const cardUsdBalance = cardBalance.USD;
  const cardEurBalance = cardBalance.EUR;
  
  // Display card balance based on selected currency
  const displayBalance = balanceCurrency === "USD" ? cardUsdBalance : cardEurBalance;
  const displaySymbol = balanceCurrency === "USD" ? "$" : "\u20AC";
  
  // Secondary display (for the other currency)
  const secondaryBalance = balanceCurrency === "USD" ? cardEurBalance : cardUsdBalance;

  // Card display values
  const cardNumber = cardData?.number || "";
  const formattedNumber = formatCardNumber(cardNumber);
  const maskedNumber = maskCardNumber(cardNumber);
  const last4 = cardNumber.replace(/\s/g, "").slice(-4);
  const cardExpiry = cardData?.expiry || "";
  const cardCvv = cardData?.cvv || "";
  const cardHolder = cardData?.holder || "PIONEER";
  const cardBrand = cardData?.brand || "MASTERCARD";
  const cardType = cardData?.type || "VIRTUAL";
  const dailyLimit = cardData?.dailyLimit || 1000;
  const monthlyLimit = dailyLimit * 5;

  // Card style configurations - MUST match VirtualCard.tsx and order page exactly
  const CARD_STYLES: Record<string, {
    gradient: string;
    shadow: string;
    label: string;
    labelColor: string;
    pattern: string;
    accentColor: string;
    brand: string;
  }> = {
    // MASTERCARD Types
    PLATINIUM: {
      gradient: "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]",
      shadow: "shadow-2xl shadow-cyan-600/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "mastercard",
      accentColor: "text-cyan-400",
      brand: "MASTERCARD",
    },
    PREMIUM: {
      gradient: "bg-gradient-to-br from-[#00897b] via-[#00796b] to-[#004d40]",
      shadow: "shadow-2xl shadow-teal-600/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "mastercard",
      accentColor: "text-teal-400",
      brand: "MASTERCARD",
    },
    GOLD: {
      gradient: "bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#0d1b4c]",
      shadow: "shadow-2xl shadow-indigo-600/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "mastercard",
      accentColor: "text-indigo-300",
      brand: "MASTERCARD",
    },
    ULTRA: {
      gradient: "bg-gradient-to-br from-[#212121] via-[#424242] to-[#0a0a0a]",
      shadow: "shadow-2xl shadow-white/10",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "mastercard",
      accentColor: "text-white",
      brand: "MASTERCARD",
    },
    // VISA Types
    VISA_CLASSIC: {
      gradient: "bg-gradient-to-br from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]",
      shadow: "shadow-2xl shadow-indigo-900/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "visa",
      accentColor: "text-[#3b5bdb]",
      brand: "VISA",
    },
    VISA_GOLD: {
      gradient: "bg-gradient-to-br from-[#c9a227] via-[#d4af37] to-[#aa8c2c]",
      shadow: "shadow-2xl shadow-amber-600/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#1a1a1a]",
      pattern: "visa",
      accentColor: "text-amber-300",
      brand: "VISA",
    },
    VISA_PLATINUM: {
      gradient: "bg-gradient-to-br from-[#546e7a] via-[#607d8b] to-[#37474f]",
      shadow: "shadow-2xl shadow-slate-500/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "visa",
      accentColor: "text-slate-300",
      brand: "VISA",
    },
    VISA_INFINITE: {
      gradient: "bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#0a0a0a]",
      shadow: "shadow-2xl shadow-white/10",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "visa",
      accentColor: "text-white",
      brand: "VISA",
    },
  };

  // Get default style based on brand
  const getDefaultStyle = (brand: string) => {
    if (brand?.toUpperCase() === "VISA") {
      return {
        gradient: "bg-gradient-to-br from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]",
        shadow: "shadow-2xl shadow-indigo-900/30",
        label: "PIMPAY VIRTUAL",
        labelColor: "text-[#FFD700]",
        pattern: "visa",
        accentColor: "text-[#3b5bdb]",
        brand: "VISA",
      };
    }
    return {
      gradient: "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]",
      shadow: "shadow-2xl shadow-blue-600/20",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "mastercard",
      accentColor: "text-blue-400",
      brand: "MASTERCARD",
    };
  };

  // Get card styles based on card type (VISA_GOLD, VISA_PLATINUM, PLATINIUM, etc.)
  const cardStyles = CARD_STYLES[cardType.toUpperCase()] || getDefaultStyle(cardBrand);
  
  // Use actual brand for logo/pattern display
  const isVisa = cardBrand.toUpperCase() === "VISA";

  const cardStyles = getCardStyles();

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
        <button onClick={() => router.push("/cards")} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
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
                className={`absolute inset-0 w-full h-full rounded-[1.5rem] p-6 overflow-hidden ${isFrozen ? "grayscale opacity-60" : cardStyles.shadow}`}
                style={{ backfaceVisibility: "hidden" }}
              >
                {/* Background gradient based on card brand */}
                <div className={`absolute inset-0 rounded-[1.5rem] overflow-hidden ${cardStyles.gradient}`}>
                  {/* Pattern based on card brand - VISA or MASTERCARD */}
                  {isVisa ? (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                      <ellipse cx="70" cy="100" rx="50" ry="45" fill="rgba(59,91,219,0.4)" />
                      <ellipse cx="45" cy="110" rx="30" ry="50" fill="rgba(59,91,219,0.35)" />
                      <path d="M 130 80 Q 150 95 130 110" stroke="rgba(59,91,219,0.5)" strokeWidth="3" fill="none" />
                      <path d="M 140 75 Q 165 95 140 115" stroke="rgba(59,91,219,0.4)" strokeWidth="3" fill="none" />
                      <path d="M 150 70 Q 180 95 150 120" stroke="rgba(59,91,219,0.3)" strokeWidth="3" fill="none" />
                      <ellipse cx="360" cy="180" rx="35" ry="35" fill="rgba(59,91,219,0.3)" />
                      <path d="M 340 180 Q 360 150 380 180 Q 360 210 340 180" stroke="rgba(59,91,219,0.4)" strokeWidth="2" fill="none" />
                    </svg>
                  ) : (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                      <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
                      <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
                      <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
                    </svg>
                  )}
                </div>

                <div className="h-full flex flex-col justify-between relative z-10">
                  {/* Header - Card type label + Brand logo */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className={cardStyles.labelColor} />
                      <span className={`text-[11px] font-black uppercase tracking-widest ${cardStyles.labelColor}`}>{cardStyles.label}</span>
                    </div>
                    {isVisa ? (
                      <span className="text-2xl font-black italic text-white/90 tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-7 h-7 rounded-full bg-[#eb001b]" />
                        <div className="w-7 h-7 rounded-full bg-[#f79e1b] -ml-3" />
                      </div>
                    )}
                  </div>

                  {/* Middle Section - Contactless icon on right */}
                  <div className="flex-1 flex items-end justify-end py-2">
                    <Wifi size={24} className={`rotate-90 ${cardStyles.accentColor}`} />
                  </div>

                  {/* Card Number - stays on one line */}
                  <div className="mb-2">
                    <button
                      onClick={() => copyToClipboard(cardNumber, "Numero")}
                      className="flex items-center gap-2 group"
                    >
                      <p className="text-lg md:text-xl font-black tracking-[0.12em] font-mono text-white whitespace-nowrap">
                        {showDetails 
                          ? formattedNumber 
                          : `•••• •••• •••• ${last4}`}
                      </p>
                      <Copy size={12} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    </button>
                  </div>

                  {/* Bottom Section - EXPIRE, CVV labels (gold for Visa, gray for others), values in white */}
                  <div className="space-y-1">
                    <div className="flex gap-8">
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>EXPIRE</p>
                        <p className="text-sm font-bold tracking-widest text-white">{showDetails ? cardExpiry : "••/••"}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>CVV</p>
                        <p className="text-sm font-bold tracking-widest text-white">{showDetails ? cardCvv : "•••"}</p>
                      </div>
                    </div>
                    {/* Cardholder name */}
                    <p className="text-sm font-black uppercase tracking-widest text-white pt-1">{cardHolder}</p>
                  </div>
                </div>
              </div>

              {/* BACK */}
              <div
                className={`absolute inset-0 w-full h-full rounded-[1.5rem] overflow-hidden ${isFrozen ? "grayscale opacity-60" : cardStyles.shadow}`}
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className={`absolute inset-0 rounded-[1.5rem] ${cardStyles.gradient}`} />

                <div className="relative h-full z-10">
                  {/* Magnetic stripe */}
                  <div className="w-full h-12 bg-gradient-to-b from-[#1a1a2e] via-[#0d0d1a] to-[#1a1a2e] mt-6 shadow-inner" />

                  <div className="p-6 flex flex-col justify-between" style={{ height: "calc(100% - 4.5rem)" }}>
                    {/* CVV signature strip with background lines */}
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center">
                        <div className="relative flex-1 h-12 bg-gradient-to-r from-[#f5f5f0] to-[#e8e8e0] rounded overflow-hidden">
                          {/* Signature lines pattern */}
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <defs>
                              <pattern id="signatureLines" patternUnits="userSpaceOnUse" width="100%" height="6">
                                <line x1="0" y1="5" x2="100%" y2="5" stroke="rgba(180,180,170,0.4)" strokeWidth="1" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#signatureLines)" />
                          </svg>
                          {/* CVV display area */}
                          <div className="absolute right-0 top-0 bottom-0 bg-white px-4 flex items-center justify-center min-w-[80px] border-l border-gray-200">
                            <span className="text-slate-900 font-mono font-black text-xl tracking-widest">
                              {showDetails ? cardCvv : "***"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-[#ec4899] uppercase tracking-widest">CODE DE SECURITE (CVV)</p>
                      <p className="text-[10px] text-gray-400">
                        Numero complet: <span className="font-mono text-white/80 ml-4">{showDetails ? formattedNumber : maskedNumber}</span>
                      </p>
                    </div>

                    {/* Legal text */}
                    <div className="mt-auto">
                      <p className="text-[8px] text-white/30">{"Cette carte est la propriete de Pimpay. Usage personnel uniquement."}</p>
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
                {secondaryBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1">{balanceCurrency === "USD" ? "EUR" : "USD"}</span>
              </p>
            </div>
            
            {/* Recharge & Withdraw Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRechargeModal(true)}
                disabled={isFrozen}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownLeft size={16} />
                <span>Recharger</span>
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={isFrozen}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpRight size={16} />
                <span>Retirer</span>
              </button>
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
                { label: "Numero de carte", value: showDetails ? formattedNumber : `•••• •••• •••��� ${last4}`, copyable: true, copyVal: cardNumber },
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
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Transactions carte</h2>
              </div>
            </div>

            {loadingTransactions ? (
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : cardTransactions.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={20} className="text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-400">Aucune transaction</p>
                <p className="text-xs text-slate-600 mt-1">Les transactions effectuees avec votre carte apparaitront ici</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
                {cardTransactions.map((tx) => (
                  <button 
                    key={tx.id} 
                    onClick={() => {
                      setSelectedTransaction(tx);
                      setShowTransactionDetail(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "credit" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {tx.type === "credit" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight truncate">{tx.merchant}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-bold text-slate-600">{tx.date}</p>
                        <span className="text-[7px] font-black text-slate-700 bg-white/5 px-1.5 py-0.5 rounded-full uppercase">{tx.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-black ${tx.type === "credit" ? "text-emerald-400" : "text-white"}`}>
                          {tx.amount} {tx.currency === "EUR" ? "\u20AC" : "$"}
                        </p>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${tx.status === "success" ? "text-emerald-500/60" : tx.status === "pending" ? "text-amber-500/60" : "text-red-500/60"}`}>
                          {tx.status === "success" ? "Confirme" : tx.status === "pending" ? "En cours" : "Echoue"}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
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

      {/* RECHARGE MODAL */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRechargeModal(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-[2rem] p-6 w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <ArrowDownLeft size={24} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Recharger la carte</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Depuis votre compte USD ou EUR</p>
                </div>
              </div>
              <button onClick={() => setShowRechargeModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Card Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-blue-400" />
                <div>
                  <p className="text-sm font-bold">{cardBrand} *{last4}</p>
                  <p className="text-[10px] text-slate-500">{cardHolder}</p>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Compte source</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRechargeCurrency("USD")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                    rechargeCurrency === "USD"
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign size={16} />
                    <span>USD</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">{getWalletBalance("USD").toFixed(2)} disponible</p>
                </button>
                <button
                  onClick={() => setRechargeCurrency("EUR")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                    rechargeCurrency === "EUR"
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Euro size={16} />
                    <span>EUR</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">{getWalletBalance("EUR").toFixed(2)} disponible</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Montant</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  {rechargeCurrency === "USD" ? "$" : "\u20AC"}
                </span>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRechargeAmount(amt.toString())}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-400 transition-all"
                  >
                    {rechargeCurrency === "USD" ? "$" : "\u20AC"}{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-500/80 font-bold">
                Frais de recharge: 2%. Montant net credite: {rechargeAmount ? (parseFloat(rechargeAmount) * 0.98).toFixed(2) : "0.00"} {rechargeCurrency}
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleRecharge}
              disabled={processingRecharge || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingRecharge ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft size={18} />
                  <span>Recharger {rechargeAmount ? `${rechargeCurrency === "USD" ? "$" : "\u20AC"}${rechargeAmount}` : ""}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-[2rem] p-6 w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                  <ArrowUpRight size={24} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Retirer vers compte</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Vers votre compte USD ou EUR</p>
                </div>
              </div>
              <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Card Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-bold">{cardBrand} *{last4}</p>
                    <p className="text-[10px] text-slate-500">{cardHolder}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">
                    ${cardBalance.USD.toFixed(2)} / {"\u20AC"}{cardBalance.EUR.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500">Solde carte USD/EUR</p>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Compte destination</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setWithdrawCurrency("USD")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                    withdrawCurrency === "USD"
                      ? "bg-orange-600/20 border-orange-500/50 text-orange-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign size={16} />
                    <span>Compte USD</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">{cardBalance.USD.toFixed(2)} dispo sur carte</p>
                </button>
                <button
                  onClick={() => setWithdrawCurrency("EUR")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                    withdrawCurrency === "EUR"
                      ? "bg-orange-600/20 border-orange-500/50 text-orange-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Euro size={16} />
                    <span>Compte EUR</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">{cardBalance.EUR.toFixed(2)} dispo sur carte</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Montant a retirer</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  {withdrawCurrency === "USD" ? "$" : "\u20AC"}
                </span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(amt.toString())}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-400 transition-all"
                  >
                    {withdrawCurrency === "USD" ? "$" : "\u20AC"}{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-500/80 font-bold">
                Frais de retrait: 1.5%. Montant net recu: {withdrawAmount ? (parseFloat(withdrawAmount) * 0.985).toFixed(2) : "0.00"} {withdrawCurrency}
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleWithdraw}
              disabled={processingWithdraw || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
              className="w-full bg-orange-600 hover:bg-orange-700 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingWithdraw ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={18} />
                  <span>Retirer {withdrawAmount ? `${withdrawCurrency === "USD" ? "$" : "\u20AC"}${withdrawAmount}` : ""}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {showTransactionDetail && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTransactionDetail(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-[2rem] p-6 w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  selectedTransaction.type === "credit" 
                    ? "bg-emerald-600/20 border-emerald-500/30" 
                    : "bg-red-600/20 border-red-500/30"
                }`}>
                  {selectedTransaction.type === "credit" 
                    ? <ArrowDownLeft size={24} className="text-emerald-400" />
                    : <ArrowUpRight size={24} className="text-red-400" />
                  }
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Details transaction</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{selectedTransaction.category}</p>
                </div>
              </div>
              <button onClick={() => setShowTransactionDetail(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Amount Display */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4 text-center">
              <p className={`text-3xl font-black ${selectedTransaction.type === "credit" ? "text-emerald-400" : "text-white"}`}>
                {selectedTransaction.amount} {selectedTransaction.currency === "EUR" ? "\u20AC" : "$"}
              </p>
              <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                selectedTransaction.status === "success" 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : selectedTransaction.status === "pending" 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-red-500/20 text-red-400"
              }`}>
                {selectedTransaction.status === "success" ? (
                  <><CheckCircle2 size={12} /> Confirme</>
                ) : selectedTransaction.status === "pending" ? (
                  <><Loader2 size={12} className="animate-spin" /> En cours</>
                ) : (
                  <><AlertTriangle size={12} /> Echoue</>
                )}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 mb-4">
              <div className="flex items-center justify-between p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</span>
                <span className="text-xs font-bold text-white text-right max-w-[180px] truncate">{selectedTransaction.merchant}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</span>
                <span className="text-xs font-bold text-white">{selectedTransaction.date}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</span>
                <span className="text-xs font-bold text-white">{selectedTransaction.type === "credit" ? "Credit (Entrant)" : "Debit (Sortant)"}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categorie</span>
                <span className="text-xs font-bold text-white capitalize">{selectedTransaction.category}</span>
              </div>
              {selectedTransaction.fee !== undefined && selectedTransaction.fee > 0 && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frais</span>
                  <span className="text-xs font-bold text-amber-400">
                    {selectedTransaction.fee.toFixed(2)} {selectedTransaction.currency === "EUR" ? "\u20AC" : "$"}
                  </span>
                </div>
              )}
              {selectedTransaction.reference && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 max-w-[140px] truncate">{selectedTransaction.reference}</span>
                    <button 
                      onClick={() => copyToClipboard(selectedTransaction.reference!, "Reference")}
                      className="p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      {copied === "Reference" ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-blue-400" />
                <div>
                  <p className="text-sm font-bold">{cardBrand} *{last4}</p>
                  <p className="text-[10px] text-slate-500">{cardHolder}</p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowTransactionDetail(false)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
