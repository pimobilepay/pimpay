"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Smartphone, Building2, Clock,
  ShieldCheck, CircleDot, ChevronDown, CheckCircle2,
  TrendingUp, Wallet as WalletIcon, Search, X,
  Globe, Activity, ArrowUpRight, ArrowDownLeft,
  CreditCard, Landmark, Copy, Info, ChevronRight,
  AlertTriangle, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, searchCountries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PI_CONSENSUS_USD, calculateExchangeWithFee } from "@/lib/exchange";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import "flag-icons/css/flag-icons.min.css";

export default function WithdrawPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"mobile" | "bank" | "logs">("mobile");

  // Common fields
  const [piAmount, setPiAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [activeContinent, setActiveContinent] = useState<string>("ALL");

  // Bank fields
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [selectedBank, setSelectedBank] = useState<string>("");

  // Wallet selector
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  // Transaction logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Loading & confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchWallets();

    const handleClickOutside = (event: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setShowWalletSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  async function fetchWallets() {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const json = await res.json();
        const userWallets = json.user?.wallets || json.wallets || [];
        setWallets(userWallets);
        const piIdx = userWallets.findIndex((w: any) => w.currency === "PI");
        if (piIdx !== -1) setActiveWalletIndex(piIdx);
      }
    } catch (err) {
      console.error("Erreur wallets:", err);
    }
  }

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/transaction/withdraw");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.transactions || []);
      }
    } catch {
      // fallback mock data
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  if (!mounted) return null;

  const currentWallet = wallets[activeWalletIndex] || { balance: 0, currency: "PI" };
  const balance = currentWallet.balance;
  const rate = currentWallet.currency === "PI" ? PI_CONSENSUS_USD : 1;
  const marketValueUsd = piAmount ? parseFloat(piAmount) * rate : 0;
  const feesUsd = marketValueUsd * 0.02;
  const conversion = piAmount
    ? calculateExchangeWithFee(
        (marketValueUsd - feesUsd) / (currentWallet.currency === "PI" ? PI_CONSENSUS_USD : 1),
        selectedCountry.currency
      )
    : { total: 0, fee: 0, subtotal: 0 };

  const formatValue = (val: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const filteredCountries = (() => {
    let list = countrySearch ? searchCountries(countrySearch) : countries;
    if (activeContinent !== "ALL") {
      list = list.filter(c => c.continent === activeContinent);
    }
    return list;
  })();

  const continents = [
    { id: "ALL", label: "All" },
    { id: "AFRICA", label: "Africa" },
    { id: "EUROPE", label: "Europe" },
    { id: "ASIA", label: "Asia" },
    { id: "AMERICA", label: "America" },
    { id: "OCEANIA", label: "Oceania" },
  ];

  const canSubmitMobile = piAmount && parseFloat(piAmount) > 0 && parseFloat(piAmount) <= balance && phoneNumber && selectedOperator;
  const canSubmitBank = piAmount && parseFloat(piAmount) > 0 && parseFloat(piAmount) <= balance && (selectedBank || bankName) && accountNumber;

  async function handleWithdraw() {
    setIsSubmitting(true);
    try {
      const method = activeTab === "mobile" ? "mobile" : "bank";
      const details = method === "mobile"
        ? { phone: `${selectedCountry.dialCode}${phoneNumber}`, provider: selectedOperator }
        : { bankName: selectedBank || bankName, accountName, accountNumber, swift: swiftCode };

      const data = {
        amount: piAmount,
        method,
        currency: selectedCountry.currency,
        details,
      };

      // Navigate to summary with encoded data
      const encoded = btoa(JSON.stringify({
        ...data,
        fiatAmount: conversion.total,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
      }));
      router.push(`/withdraw/summary?data=${encoded}`);
    } catch {
      toast.error(t("extra.preparationError"));
    } finally {
      setIsSubmitting(false);
    }
  }

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
              {t("withdraw.title")}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={8} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">
                Liquidity Outflow
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 pt-6 space-y-6">
        {/* BALANCE CARD */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md overflow-visible">
            <div className="absolute right-[-10px] bottom-[-15px] opacity-[0.04] -rotate-12 pointer-events-none">
              <TrendingUp size={120} strokeWidth={1.5} />
            </div>

            <div className="flex justify-between items-start relative z-10 mb-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentWallet.currency} {t("common.balance")} {t("common.available")}</p>

              <div className="relative" ref={walletRef}>
                <button
                  onClick={() => setShowWalletSelector(!showWalletSelector)}
                  className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2"
                >
                  <WalletIcon size={14} className="text-blue-400" />
                  <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 ${showWalletSelector ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showWalletSelector && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 mt-3 w-36 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 z-[100]"
                    >
                      {wallets.map((w, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveWalletIndex(idx);
                            setShowWalletSelector(false);
                            setPiAmount("");
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-colors ${
                            activeWalletIndex === idx ? "bg-blue-600 text-white" : "hover:bg-white/5 text-slate-400"
                          }`}
                        >
                          {w.currency}
                          {activeWalletIndex === idx && <CheckCircle2 size={12} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black tracking-tighter text-white">
                {currentWallet.currency === "PI" ? "\u03c0" : ""} {formatValue(balance)}
              </span>
              <span className="text-sm font-black text-blue-400">{currentWallet.currency}</span>
            </div>
          </div>
        </section>

        {/* TABS */}
        <nav className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5">
          {([
            { id: "mobile" as const, label: t("deposit.mobile"), icon: Smartphone },
            { id: "bank" as const, label: t("extra.bankTransfer"), icon: Building2 },
            { id: "logs" as const, label: t("wallet.history"), icon: Clock },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {/* ========================= MOBILE TAB ========================= */}
          {activeTab === "mobile" && (
            <motion.div
              key="mobile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
                {/* Country */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("withdraw.destination")}</label>
                  <button
                    onClick={() => setIsCountryModalOpen(true)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm text-lg`} />
                      <div className="text-left">
                        <span className="text-xs font-black uppercase tracking-tight block">{selectedCountry.name}</span>
                        <span className="text-[9px] font-bold text-blue-500">{selectedCountry.currency} - {selectedCountry.dialCode}</span>
                      </div>
                    </div>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>
                </div>

                {/* Operator */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("deposit.mobileOperator")}</label>
                  {selectedCountry.operators.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCountry.operators.map((op) => (
                        <button
                          key={op.id}
                          onClick={() => setSelectedOperator(op.name)}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-3 active:scale-95 ${
                            selectedOperator === op.name
                              ? "bg-blue-600/10 border-blue-500/30"
                              : "bg-white/[0.03] border-white/5 hover:border-white/10"
                          }`}
                        >
                          {op.icon ? (
                            <img
                              src={op.icon}
                              alt={op.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Smartphone size={14} className="text-blue-400" />
                            </div>
                          )}
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase block">{op.name}</span>
                            {op.features.cashOut && (
                              <span className="text-[7px] font-bold text-emerald-500 uppercase">Cash Out</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                      <AlertTriangle size={16} className="text-amber-400" />
                      <p className="text-[10px] font-bold text-amber-400">
                        {t("deposit.noOperatorWarning")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("transfer.beneficiary")}</label>
                  <div className="flex gap-2">
                    <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center gap-2">
                      <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm`} />
                      <span className="text-xs font-black text-blue-500">{selectedCountry.dialCode}</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="Ex: 812345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* AMOUNT */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {t("withdraw.amount")} ({currentWallet.currency})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={piAmount}
                      onChange={(e) => setPiAmount(e.target.value)}
                      className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 placeholder:text-slate-800 focus:border-blue-500/50 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                      {currentWallet.currency}
                    </div>
                  </div>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-2">
                  {["10", "50", "100", "500"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPiAmount(val)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                        piAmount === val
                          ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                          : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-white/10"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {/* Conversion */}
                {piAmount && parseFloat(piAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                      <span>{"Gross Value"}</span>
                      <span className="text-white">$ {formatValue(marketValueUsd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-500">
                      <span>{"PimPay Fees (2%)"}</span>
                      <span>- $ {formatValue(feesUsd)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-black text-blue-500 uppercase block">{"Estimated Net Cashout"}</span>
                        <span className="text-2xl font-black text-white">{formatValue(conversion.total)}</span>
                      </div>
                      <span className="text-sm font-black text-slate-400">{selectedCountry.currency}</span>
                    </div>
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  onClick={handleWithdraw}
                  disabled={!canSubmitMobile || isSubmitting}
                  className={`w-full h-16 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    canSubmitMobile
                      ? "bg-blue-600 text-white shadow-blue-600/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : parseFloat(piAmount || "0") > balance ? (
                    t("transfer.insufficientFunds")
                  ) : (
                    "Verify Cashout"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================= BANK TAB ========================= */}
          {activeTab === "bank" && (
            <motion.div
              key="bank"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
                {/* Country */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("withdraw.destination")}</label>
                  <button
                    onClick={() => setIsCountryModalOpen(true)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm text-lg`} />
                      <div className="text-left">
                        <span className="text-xs font-black uppercase tracking-tight block">{selectedCountry.name}</span>
                        <span className="text-[9px] font-bold text-blue-500">{selectedCountry.currency}</span>
                      </div>
                    </div>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>
                </div>

                {/* Bank Selection */}
                {selectedCountry.banks.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{"Bank"}</label>
                    <div className="space-y-2">
                      {selectedCountry.banks.map((bank) => (
                        <button
                          key={bank.bic}
                          onClick={() => {
                            setSelectedBank(bank.name);
                            setSwiftCode(bank.swift);
                          }}
                          className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 active:scale-[0.98] text-left ${
                            selectedBank === bank.name
                              ? "bg-blue-600/10 border-blue-500/30"
                              : "bg-white/[0.03] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
                            <Landmark size={18} className="text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate">{bank.name}</p>
                            <p className="text-[8px] font-bold text-slate-600">SWIFT: {bank.swift}</p>
                          </div>
                          {selectedBank === bank.name && (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{"Bank Name"}</label>
                    <input
                      type="text"
                      placeholder="Ex: Bank of America"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                )}

                {/* Account Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{"Beneficiary Name"}</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
                  />
                </div>

                {/* Account / IBAN */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{"IBAN / Account Number"}</label>
                  <input
                    type="text"
                    placeholder="Ex: FR76 3000 4028 ..."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-mono font-bold outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
                  />
                </div>

                {/* SWIFT */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Code SWIFT / BIC</label>
                  <input
                    type="text"
                    placeholder="Ex: BNPAFRPP"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-mono font-bold uppercase outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {t("withdraw.amount")} ({currentWallet.currency})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={piAmount}
                      onChange={(e) => setPiAmount(e.target.value)}
                      className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 placeholder:text-slate-800 focus:border-blue-500/50 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                      {currentWallet.currency}
                    </div>
                  </div>
                </div>

                {/* Conversion */}
                {piAmount && parseFloat(piAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                      <span>{"Gross Value"}</span>
                      <span className="text-white">$ {formatValue(marketValueUsd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-500">
                      <span>{"PimPay Fees (2%)"}</span>
                      <span>- $ {formatValue(feesUsd)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-black text-blue-500 uppercase block">{"Estimated Net Transfer"}</span>
                        <span className="text-2xl font-black text-white">{formatValue(conversion.total)}</span>
                      </div>
                      <span className="text-sm font-black text-slate-400">{selectedCountry.currency}</span>
                    </div>
                  </motion.div>
                )}

                {/* Info */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-slate-400">
                    {"Bank transfers take between "}<span className="text-white">{"24h and 48h"}</span>{" business days. External bank fees are not included."}
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleWithdraw}
                  disabled={!canSubmitBank || isSubmitting}
                  className={`w-full h-16 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    canSubmitBank
                      ? "bg-blue-600 text-white shadow-blue-600/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : parseFloat(piAmount || "0") > balance ? (
                    t("transfer.insufficientFunds")
                  ) : (
                    "Initiate Transfer"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================= LOGS TAB ========================= */}
          {activeTab === "logs" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-500" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">{"Recent Withdrawals"}</h2>
                </div>
              </div>

              {logsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : logs.length > 0 ? (
                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
                  {logs.map((log: any, i: number) => (
                    <div key={log.id || i} className="flex items-center gap-4 p-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        log.status === "COMPLETED" || log.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : log.status === "FAILED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                      }`}>
                        <ArrowUpRight size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-tight truncate">
                          {log.description || log.method || "Retrait"}
                        </p>
                        <p className="text-[9px] font-bold text-slate-600">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {log.amount} {log.currency || "PI"}
                        </p>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${
                          log.status === "COMPLETED" || log.status === "SUCCESS"
                            ? "text-emerald-500/60"
                            : log.status === "FAILED"
                              ? "text-red-500/60"
                              : "text-amber-500/60"
                        }`}>
                          {log.status === "COMPLETED" || log.status === "SUCCESS" ? "Confirme" : log.status === "FAILED" ? "Echoue" : "En cours"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={28} className="text-slate-600" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Aucun retrait</p>
                  <p className="text-[10px] text-slate-600 font-bold">
                    {"Vos retraits apparaitront ici une fois effectues."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROTECTION NOTICE */}
        <div className="p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 flex-shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">PimPay Protection</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Fonds proteges. Traitement : 15 min (Mobile) a 48h (Banque). Toutes les transactions sont securisees par le protocole PimPay.
            </p>
          </div>
        </div>
      </main>

      {/* COUNTRY MODAL */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-[#020617] flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 pt-12 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black uppercase tracking-tighter">Selection Pays</h2>
                <button
                  onClick={() => {
                    setIsCountryModalOpen(false);
                    setCountrySearch("");
                    setActiveContinent("ALL");
                  }}
                  className="p-2.5 bg-white/5 rounded-xl border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher un pays, devise..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-xs font-bold outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              {/* Continent Filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {continents.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveContinent(c.id)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeContinent === c.id
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-slate-500 border border-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Country List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {filteredCountries.length === 0 ? (
                <div className="text-center py-12">
                  <Globe size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">Aucun pays trouve</p>
                </div>
              ) : (
                filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setSelectedCountry(c);
                      setSelectedOperator("");
                      setSelectedBank("");
                      setSwiftCode("");
                      setIsCountryModalOpen(false);
                      setCountrySearch("");
                      setActiveContinent("ALL");
                    }}
                    className={`w-full p-4 flex items-center justify-between rounded-2xl border transition-all active:scale-[0.98] ${
                      selectedCountry.code === c.code
                        ? "bg-blue-600/10 border-blue-500/30"
                        : "bg-white/[0.03] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`fi fi-${c.code.toLowerCase()} rounded-sm text-xl`} />
                      <div className="text-left">
                        <span className="text-xs font-black uppercase tracking-tight block">{c.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-blue-500">{c.dialCode}</span>
                          <span className="text-[7px] font-black text-slate-700 bg-white/5 px-1.5 py-0.5 rounded-full uppercase">{c.currency}</span>
                          {c.isActive && (
                            <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase">Actif</span>
                          )}
                          {c.operators.length > 0 && (
                            <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase">
                              {c.operators.length} Op.
                            </span>
                          )}
                          {c.banks.length > 0 && (
                            <span className="text-[7px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full uppercase">
                              {c.banks.length} Bq.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedCountry.code === c.code && (
                      <CheckCircle2 size={16} className="text-blue-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">PimPay Withdraw Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Secure</span>
          </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
