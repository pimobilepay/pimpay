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
  ShieldCheck,
  Globe,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { QRScanner } from "@/components/qr-scanner";

// --- TYPES ---
interface WalletData {
  currency: string;
  balance: number;
  type?: string;
}

interface RecipientData {
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isExternal?: boolean;
}

// --- CURRENCY CONFIG ---
const CURRENCY_META: Record<string, { symbol: string; network: string; color: string; icon: string }> = {
  PI: { symbol: "PI", network: "Pi Mainnet", color: "text-blue-400", icon: "pi-coin.png" },
  XAF: { symbol: "XAF", network: "PimPay", color: "text-emerald-400", icon: "" },
  SDA: { symbol: "SDA", network: "Sidra Mainnet", color: "text-emerald-400", icon: "sidrachain.png" },
  USDT: { symbol: "USDT", network: "TRC20", color: "text-emerald-400", icon: "tether-usdt.png" },
  BTC: { symbol: "BTC", network: "Bitcoin", color: "text-orange-400", icon: "bitcoin.png" },
};

// --- QUICK AMOUNT PRESETS ---
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMountedRef = useRef(true);

  // Form state
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("XAF");
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Visual state
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<RecipientData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  const networkFee = 0.01;

  // --- FETCH REAL BALANCES ---
  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        const userWallets = data.user?.wallets || [];
        setWallets(userWallets);
        if (
          userWallets.length > 0 &&
          !userWallets.find((w: WalletData) => w.currency === "XAF")
        ) {
          setSelectedCurrency(userWallets[0].currency);
        }
      }
    } catch (err) {
      console.error("Wallet fetch error:", err);
    } finally {
      if (isMountedRef.current) setIsLoadingWallets(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    fetchWallets();

    const addr = searchParams.get("address");
    const cur = searchParams.get("currency");
    if (addr) setRecipientId(addr);
    if (cur) setSelectedCurrency(cur);

    return () => {
      isMountedRef.current = false;
    };
  }, [searchParams]);

  const currentWallet = wallets.find((w) => w.currency === selectedCurrency) || {
    balance: 0,
    currency: selectedCurrency,
  };

  // --- RECIPIENT SEARCH ---
  useEffect(() => {
    const abortController = new AbortController();
    const searchUser = async () => {
      if (recipientId.length >= 3) {
        setIsSearching(true);
        try {
          const res = await fetch(
            `/api/user/search?query=${encodeURIComponent(recipientId)}`,
            { signal: abortController.signal }
          );
          if (res.ok && isMountedRef.current) {
            const data = await res.json();
            setRecipientData(data);
          } else if (
            isMountedRef.current &&
            (recipientId.startsWith("0x") || recipientId.startsWith("G") || recipientId.length > 20)
          ) {
            setRecipientData({
              firstName: "Adresse",
              lastName: "Externe",
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientId}`,
              isExternal: true,
            });
          } else {
            setRecipientData(null);
          }
        } catch (err: any) {
          if (err.name !== "AbortError") setRecipientData(null);
        } finally {
          if (isMountedRef.current) setIsSearching(false);
        }
      } else {
        setRecipientData(null);
      }
    };
    const timer = setTimeout(searchUser, 600);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [recipientId]);

  // --- QR SCANNER CALLBACK ---
  const handleQRResult = (data: string) => {
    setShowQRScanner(false);
    if (data && data.length > 0) {
      setRecipientId(data);
      toast.success("Adresse scannee avec succes");
    }
  };

  // --- SUBMIT ---
  const handleGoToSummary = async () => {
    if (!recipientId || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0) return toast.error("Montant invalide");

    if (numericAmount > currentWallet.balance) {
      toast.error(`Solde insuffisant en ${selectedCurrency}`);
      return;
    }

    setIsSubmitting(true);
    const params = new URLSearchParams({
      recipient: recipientId,
      recipientName: recipientData
        ? `${recipientData.firstName} ${recipientData.lastName}`
        : recipientId,
      recipientAvatar: recipientData?.avatar || "",
      amount: amount,
      currency: selectedCurrency,
      fee: networkFee.toString(),
      description: description || "Transfert PimPay",
    });

    router.push(`/transfer/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  const currencyMeta = CURRENCY_META[selectedCurrency] || CURRENCY_META.XAF;

  return (
    <div className="flex-1 min-h-screen bg-[#020617] text-white font-sans">
      <div className="max-w-md mx-auto px-5 pt-10 pb-32">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              Envoyer
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">
                PimPay Secure Protocol
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Globe size={10} className="text-blue-400" />
            <span className="text-[8px] font-black text-blue-400 uppercase">Web3</span>
          </div>
        </header>

        <div className="space-y-5">
          {/* WALLET SELECTOR */}
          <section className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">
              Source des fonds
            </label>
            <div className="relative">
              <button
                disabled={isLoadingWallets}
                onClick={() => setShowWalletPicker(!showWalletPicker)}
                className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                    {currencyMeta.icon ? (
                      <img
                        src={`/${currencyMeta.icon}`}
                        alt={selectedCurrency}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <WalletIcon size={18} className="text-blue-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-tight">
                      {selectedCurrency}
                    </p>
                    <p className="text-[10px] text-emerald-500 font-bold">
                      {isLoadingWallets
                        ? "Chargement..."
                        : `${currentWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} disponible`}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 transition-transform ${showWalletPicker ? "rotate-180" : ""}`}
                />
              </button>

              {showWalletPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {wallets.length > 0 ? (
                    wallets.map((w) => {
                      const meta = CURRENCY_META[w.currency];
                      return (
                        <button
                          key={w.currency}
                          onClick={() => {
                            setSelectedCurrency(w.currency);
                            setShowWalletPicker(false);
                          }}
                          className="w-full p-4 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                        >
                          <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                            {meta?.icon ? (
                              <img
                                src={`/${meta.icon}`}
                                alt={w.currency}
                                className="w-5 h-5 object-contain"
                              />
                            ) : (
                              <span className="text-[9px] font-black uppercase">
                                {w.currency.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-xs font-black uppercase">{w.currency}</p>
                            <p className="text-[9px] text-slate-500 font-bold">
                              {w.balance.toLocaleString()} {w.currency}
                            </p>
                          </div>
                          {selectedCurrency === w.currency && (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-[10px] text-center text-slate-500 font-black">
                      AUCUN WALLET
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Network badge */}
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[8px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded uppercase">
                {currencyMeta.network}
              </span>
              <span className="text-[8px] font-bold text-slate-600">
                Frais: {networkFee} {selectedCurrency}
              </span>
            </div>
          </section>

          {/* RECIPIENT SECTION */}
          <section className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">
              Beneficiaire
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Pseudo, email ou adresse wallet..."
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 pl-12 pr-14 text-sm text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700"
              />
              <Search className="absolute left-4 top-4.5 text-slate-600" size={18} />
              <button
                onClick={() => setShowQRScanner(true)}
                className="absolute right-3 top-3 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors active:scale-90"
                aria-label="Scanner un QR code"
              >
                <Scan size={18} />
              </button>
            </div>

            {isSearching && (
              <div className="text-[9px] text-blue-400 font-black uppercase px-2 flex gap-2 items-center tracking-widest">
                <Loader2 className="animate-spin" size={12} /> Recherche
                blockchain...
              </div>
            )}

            {recipientData && (
              <div className="flex items-center gap-3.5 p-3.5 border rounded-2xl bg-blue-600/5 border-blue-600/20">
                <div className="relative w-11 h-11 flex-shrink-0">
                  <img
                    src={recipientData.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientId}`}
                    alt="Avatar"
                    className="w-full h-full rounded-full border-2 border-blue-500/30 object-cover bg-slate-800"
                    crossOrigin="anonymous"
                  />
                  {!recipientData.isExternal && (
                    <div className="absolute -bottom-1 -right-1 bg-[#020617] p-0.5 rounded-full">
                      <ShieldCheck
                        className="text-blue-500"
                        size={13}
                        fill="currentColor"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-tight truncate">
                    {recipientData.firstName} {recipientData.lastName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {recipientData.isExternal ? (
                      <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                        Externe
                      </span>
                    ) : (
                      <span className="text-[9px] text-blue-400 uppercase font-black tracking-tight">
                        @{recipientData.username || "pimuser"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRecipientId("");
                    setRecipientData(null);
                  }}
                  className="p-1.5 text-slate-600 hover:text-white"
                  aria-label="Effacer le destinataire"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </section>

          {/* AMOUNT INPUT */}
          <section className="space-y-4 pt-2">
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent p-3 text-5xl font-black outline-none text-center text-white placeholder:text-white/5 transition-all"
              />
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                  {selectedCurrency}
                </span>
                {amount && parseFloat(amount) > currentWallet.balance && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] font-bold text-red-400">
                    <AlertTriangle size={10} /> Insuffisant
                  </span>
                )}
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                    amount === val.toString()
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                      : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => setAmount(currentWallet.balance.toString())}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border bg-white/[0.03] border-white/5 text-emerald-500 hover:border-emerald-500/30 transition-all"
              >
                MAX
              </button>
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">
              Note (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Remboursement, Paiement service..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
            />
          </section>

          {/* FEE INFO */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Info size={12} className="text-slate-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Resume
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-500">Montant</span>
                <span className="text-white">
                  {parseFloat(amount).toLocaleString()} {selectedCurrency}
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide">
                <span className="text-slate-500">Frais reseau</span>
                <span className="text-slate-400">
                  {networkFee} {selectedCurrency}
                </span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between text-[11px] font-black uppercase">
                <span className="text-blue-400">Total debit</span>
                <span className="text-white">
                  {(parseFloat(amount) + networkFee).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {selectedCurrency}
                </span>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            disabled={isSubmitting || !amount || !recipientId || (parseFloat(amount) > currentWallet.balance)}
            onClick={handleGoToSummary}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-sm ${
              isSubmitting || !amount || !recipientId || (parseFloat(amount) > currentWallet.balance)
                ? "bg-slate-800/50 text-slate-600"
                : "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/15 active:scale-[0.98]"
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
                <ArrowUpRight size={18} />
              </>
            )}
          </button>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <ShieldCheck size={12} className="text-slate-600" />
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
              Transaction chiffree bout-en-bout
            </p>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && <QRScanner onClose={handleQRResult} />}

      <div className="lg:hidden">
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
      </div>
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
