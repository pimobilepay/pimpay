"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CircleDot,
  Smartphone,
  CreditCard,
  Bitcoin,
  ShieldCheck,
  Zap,
  Loader2,
  RefreshCcw,
  ChevronDown,
  CheckCircle2,
  Shield,
  Search,
  Lock,
  Clock,
  Info,
  AlertTriangle,
  TrendingUp,
  Banknote,
  Wallet,
  HelpCircle,
} from "lucide-react";

import { countries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PiButton } from "@/components/PiButton";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import "flag-icons/css/flag-icons.min.css";

const PI_GCV_PRICE = 314159;

// ===================== SUB COMPONENTS =====================

function DepositBanner({ t }: { t: (key: string) => string }) {
  return (
    <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-600/15 via-blue-800/10 to-transparent border border-white/5 overflow-hidden">
      <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.04]">
        <Zap size={120} className="text-blue-500" />
      </div>
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20 shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">
            {t("deposit.secureDeposit")}
          </p>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
            {t("deposit.secureBanner")}
          </p>
        </div>
      </div>
    </section>
  );
}

function DepositTabs({
  activeTab,
  onTabChange,
  t,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  t: (key: string) => string;
}) {
  const tabs = [
    { id: "mobile", label: t("deposit.mobile"), icon: <Smartphone size={16} /> },
    { id: "card", label: t("deposit.card"), icon: <CreditCard size={16} /> },
    { id: "crypto", label: t("deposit.crypto"), icon: <Bitcoin size={16} /> },
  ];

  return (
    <nav className="grid grid-cols-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10.5px] font-black uppercase transition-all ${
            activeTab === tab.id
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </nav>
  );
}

function CountrySelector({
  selectedCountry,
  onOpen,
  t,
}: {
  selectedCountry: Country;
  onOpen: () => void;
  t: (key: string) => string;
}) {
  return (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                  {t("deposit.amountUsd")}
                </label>
      <button
        onClick={onOpen}
        className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-4">
          <span
            className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px] scale-110`}
          />
          <div className="text-left">
            <span className="text-sm font-black uppercase tracking-tight block">
              {selectedCountry.name}
            </span>
            <span className="text-[9px] text-slate-500 font-bold">
              {selectedCountry.currency} - {selectedCountry.dialCode}
            </span>
          </div>
        </div>
        <ChevronDown size={18} className="text-slate-500" />
      </button>
    </div>
  );
}

function FeesBreakdown({
  amount,
  fee,
  totalLocal,
  currency,
  t,
}: {
  amount: string;
  fee: string;
  totalLocal: string;
  currency: string;
  t: (key: string) => string;
}) {
  if (!amount) return null;

  return (
    <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Banknote size={14} className="text-slate-400" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {t("deposit.recap")}
        </span>
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-slate-500">{t("common.amount")}</span>
        <span className="text-white">{amount} USD</span>
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-slate-500">{t("deposit.networkFeePercent")}</span>
        <span className="text-red-400">+{fee} USD</span>
      </div>
      <div className="h-px bg-white/5" />
      <div className="flex justify-between text-[13px] font-black uppercase text-emerald-400">
        <span>{t("deposit.totalToPay")}</span>
        <span>
          {totalLocal} {currency}
        </span>
      </div>
    </div>
  );
}

function TransactionInfo({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info size={14} className="text-blue-400" />
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
          {t("deposit.importantInfo")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-start gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/5">
          <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-white uppercase">
              {t("deposit.processingDelay")}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
              {t("deposit.processingDelayDesc")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/5">
          <TrendingUp size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-white uppercase">
              {t("deposit.transactionFees")}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
              {t("deposit.transactionFeesDesc")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/5">
          <Wallet size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-white uppercase">
              {t("deposit.limits")}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
              {t("deposit.limitsDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ t }: { t: (key: string) => string }) {
  return (
    <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-blue-400" />
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
          {t("deposit.securityGuarantees")}
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div>
            <h4 className="text-[10px] font-black uppercase text-white">
              {t("deposit.fundsProtected")}
            </h4>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              {t("deposit.fundsProtectedDesc")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Shield size={18} className="text-blue-400 shrink-0" />
          <div>
            <h4 className="text-[10px] font-black uppercase text-white">
              {t("deposit.realTimeAudit")}
            </h4>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              {t("deposit.realTimeAuditDesc")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Lock size={18} className="text-amber-400 shrink-0" />
          <div>
            <h4 className="text-[10px] font-black uppercase text-white">
              {t("deposit.endToEndEncryption")}
            </h4>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              {t("deposit.endToEndEncryptionDesc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection({ t }: { t: (key: string) => string }) {
  const faqs = [
    {
      q: t("deposit.faqMobileTime"),
      a: t("deposit.faqMobileTimeAnswer"),
    },
    {
      q: t("deposit.faqFees"),
      a: t("deposit.faqFeesAnswer"),
    },
    {
      q: t("deposit.faqPending"),
      a: t("deposit.faqPendingAnswer"),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle size={14} className="text-blue-400" />
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
          {t("deposit.faq")}
        </span>
      </div>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden"
          >
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
              <span className="text-[10px] font-black text-white uppercase tracking-wide pr-4">
                {faq.q}
              </span>
              <ChevronDown
                size={14}
                className="text-slate-500 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="px-4 pb-4">
              <p className="text-[9px] text-slate-400 leading-relaxed">
                {faq.a}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function CountryModal({
  isOpen,
  onClose,
  onSelect,
  searchQuery,
  onSearchChange,
  filteredCountries,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredCountries: Country[];
  t: (key: string) => string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6 pt-4">
            <h2 className="text-xl font-black uppercase tracking-tighter">
              {t("deposit.selectCountry")}
            </h2>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase"
            >
              {t("deposit.closeBtn")}
            </button>
          </div>
          <div className="relative mb-4">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder={t("deposit.searchCountry")}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-sm outline-none font-medium"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className="w-full p-4 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 active:bg-blue-600/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`fi fi-${c.code.toLowerCase()} scale-125 rounded-sm`}
                  />
                  <div className="text-left">
                    <span className="text-xs font-black uppercase tracking-tight block">
                      {c.name}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {c.currency}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-500">
                  {c.dialCode}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================== MAIN PAGE =====================

export default function DepositPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mobile");

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CG") || countries[0]
  );

  const [selectedOperator, setSelectedOperator] = useState(
    selectedCountry.operators?.[0] || null
  );

  const feesCalculation = useMemo(() => {
    const val = parseFloat(amount) || 0;
    const fee = val * 0.02;
    const totalUsd = val + fee;
    const localRate = selectedCountry.piToLocalRate || 600;
    return {
      fee: fee.toFixed(2),
      totalUsd: totalUsd.toFixed(2),
      totalLocal: (totalUsd * localRate).toLocaleString(),
      piEquivalent: val > 0 ? (val / PI_GCV_PRICE).toFixed(8) : "0",
      piAmount: val > 0 ? val / PI_GCV_PRICE : 0,
    };
  }, [amount, selectedCountry]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedCountry.operators?.length > 0) {
      setSelectedOperator(selectedCountry.operators[0]);
    } else {
      setSelectedOperator(null);
    }
  }, [selectedCountry]);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMobileDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t("deposit.enterValidAmount"));
      return;
    }
    if (!phoneNumber) {
      toast.error(t("deposit.enterPhoneNumber"));
      return;
    }
    if (!selectedOperator) {
      toast.error(t("deposit.selectOperator"));
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading(t("deposit.sendingPaymentRequest"));

    try {
      const response = await fetch("/api/transaction/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          method: selectedOperator.name,
          phone: `${selectedCountry.dialCode}${phoneNumber.replace(/\s/g, "")}`,
          currency: selectedCountry.currency,
          operatorId: selectedOperator.id,
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(t("deposit.requestSent"));
        router.push(`/deposit/confirm?ref=${result.reference}`);
      } else {
        toast.error(result.error || t("deposit.depositError"));
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error(t("deposit.connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
              {t("deposit.title")}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={8} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">
                Liquidity Inflow
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setIsRefreshing(true);
            setTimeout(() => setIsRefreshing(false), 1000);
          }}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
        >
          <RefreshCcw
            size={18}
            className={
              isRefreshing
                ? "animate-spin text-blue-500"
                : "text-slate-400"
            }
          />
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* BANNER */}
        <DepositBanner t={t} />

        {/* TABS */}
        <DepositTabs activeTab={activeTab} onTabChange={setActiveTab} t={t} />

        {/* COUNTRY SELECTOR */}
        <CountrySelector
          selectedCountry={selectedCountry}
          onOpen={() => setIsCountryModalOpen(true)}
          t={t}
        />

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {/* ====== MOBILE MONEY ====== */}
          {activeTab === "mobile" && (
            <motion.div
              key="mobile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/30 rounded-3xl border border-white/5 p-6 space-y-6"
            >
              {/* AMOUNT */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                  {t("deposit.amountUsd")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 focus:border-blue-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black">
                    USD
                  </div>
                </div>
                {/* Quick amounts */}
                <div className="flex gap-2 mt-2">
                  {[5, 10, 25, 50, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                        amount === val.toString()
                          ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                          : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {val}$
                    </button>
                  ))}
                </div>
              </div>

              {/* OPERATORS */}
              {selectedCountry.operators?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    {t("deposit.mobileOperator")}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedCountry.operators.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => setSelectedOperator(op)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          selectedOperator?.id === op.id
                            ? "bg-blue-600/10 border-blue-500/40"
                            : "bg-black/20 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center p-1">
                            <img
                              src={op.icon}
                              alt={op.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://cdn-icons-png.flaticon.com/512/722/722174.png";
                              }}
                            />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-black uppercase block">
                              {op.name}
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">
                              {op.features.cashIn
                                ? t("deposit.depositAvailable")
                                : t("deposit.unavailable")}
                            </span>
                          </div>
                        </div>
                        {selectedOperator?.id === op.id && (
                          <CheckCircle2
                            size={18}
                            className="text-blue-500"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No operators warning */}
              {(!selectedCountry.operators ||
                selectedCountry.operators.length === 0) && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                  <p className="text-[10px] text-amber-300 font-bold">
                    {t("deposit.noOperatorWarning")}
                  </p>
                </div>
              )}

              {/* FEES BREAKDOWN */}
              <FeesBreakdown
                amount={amount}
                fee={feesCalculation.fee}
                totalLocal={feesCalculation.totalLocal}
                currency={selectedCountry.currency}
                t={t}
              />

              {/* PHONE NUMBER */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                  {t("deposit.phoneNumber")}
                </label>
                <div className="flex gap-2">
                  <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">
                    {selectedCountry.dialCode}
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Ex: 06 444 22 11"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Processing time notice */}
              <div className="flex items-center gap-2.5 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <Clock size={14} className="text-blue-400 shrink-0" />
                <p className="text-[9px] text-blue-300/80 font-bold leading-relaxed">
                  {t("deposit.estimatedDelay")}
                </p>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                onClick={handleMobileDeposit}
                disabled={isLoading || !amount || !phoneNumber}
                className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl flex items-center justify-center transition-all active:scale-[0.98] ${
                  isLoading || !amount || !phoneNumber
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-blue-600 text-white shadow-blue-600/20"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  t("deposit.payNow")
                )}
              </button>
            </motion.div>
          )}

          {/* ====== CARD ====== */}
          {activeTab === "card" && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/30 rounded-3xl border border-white/5 p-6 space-y-5"
            >
              <div className="flex items-center gap-2 mb-2 text-emerald-500">
                <Lock size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {t("deposit.secureSSL")}
                </span>
              </div>

              {/* Amount for card */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                  {t("deposit.amountUsd")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-xl font-black outline-none text-blue-500 focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              <input
                placeholder={t("deposit.cardNumber")}
                className="w-full h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="MM/YY"
                  className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors"
                />
                <input
                  placeholder="CVC"
                  className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <Info size={14} className="text-blue-400 shrink-0" />
                <p className="text-[9px] text-blue-300/80 font-bold leading-relaxed">
                  {t("deposit.cardFeeInfo")}
                </p>
              </div>

              <button className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-transform">
                {t("deposit.debitCard")}
              </button>
            </motion.div>
          )}

          {/* ====== CRYPTO (Pi Network) ====== */}
          {activeTab === "crypto" && (
            <motion.div
              key="crypto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/30 rounded-3xl border border-white/5 p-6 space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                  <Bitcoin size={40} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tighter uppercase">
                    Pi Network Bridge
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                    {t("deposit.directMainnetTransfer")}
                  </p>
                </div>
              </div>

              {/* Amount input for crypto */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                  {t("deposit.amountUsd")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 focus:border-blue-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black">
                    USD
                  </div>
                </div>
              </div>

              {/* Conversion display */}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {t("deposit.gcvConversion")}
                  </span>
                  <span className="text-sm font-black text-blue-400">
                    {feesCalculation.piEquivalent} Pi
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {t("deposit.pimpayFees")}
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {t("deposit.freeLabel")}
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {t("deposit.blockchainFees")}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {t("deposit.estimatedBlockchainFee")}
                  </span>
                </div>
              </div>

              {/* Pi Network info notice */}
              <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <AlertTriangle
                  size={14}
                  className="text-amber-400 shrink-0 mt-0.5"
                />
                <p className="text-[9px] text-amber-300/80 font-bold leading-relaxed">
                  {t("deposit.piWarning")}
                </p>
              </div>

              {/* Pi Payment Button */}
              <PiButton
                amount={feesCalculation.piAmount}
                memo={`PimPay Deposit - ${amount || 0} USD`}
                onSuccess={(txid) => router.push(`/deposit/success?txid=${encodeURIComponent(txid)}&amount=${encodeURIComponent(amount || "0")}&method=Pi+Network`)}
                label={
                  feesCalculation.piAmount > 0
                    ? `${t("deposit.title")} ${feesCalculation.piEquivalent} Pi`
                    : t("deposit.enterAmount")
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRANSACTION INFO */}
        <TransactionInfo t={t} />

        {/* SECURITY SECTION */}
        <SecuritySection t={t} />

        {/* FAQ */}
        <FAQSection t={t} />

        {/* Footer disclaimer */}
        <div className="text-center py-4">
          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
            {t("deposit.secureGateway")}
          </p>
        </div>
      </main>

      {/* COUNTRY MODAL */}
      <CountryModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelect={setSelectedCountry}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCountries={filteredCountries}
        t={t}
      />

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
