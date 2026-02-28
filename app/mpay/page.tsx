"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Scan, ArrowLeft, Zap, ShieldCheck,
  Store, Loader2, CheckCircle2,
  Search, Fingerprint, Activity,
  Send, QrCode, Users, Bell,
  Clock, ArrowUpRight, ArrowDownLeft,
  Eye, EyeOff, ChevronRight, Star,
  Wallet, Plus, TrendingUp, BarChart3,
  X, Delete, Info, Cpu, Landmark
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";
import { ReceiveQR } from "@/components/receive-qr";

// Mock data
const MOCK_MERCHANTS = [
  { id: "PIMPAY-SHOP01", name: "PimShop", category: "E-commerce", lastPaid: "2.5 Pi", avatar: "PS" },
  { id: "PIMPAY-FOOD02", name: "PiFood", category: "Restaurant", lastPaid: "8.0 Pi", avatar: "PF" },
  { id: "PIMPAY-TECH03", name: "TechPi", category: "Tech", lastPaid: "15.0 Pi", avatar: "TP" },
  { id: "PIMPAY-MKT04", name: "PiMarket", category: "Supermarche", lastPaid: "5.2 Pi", avatar: "PM" },
  { id: "PIMPAY-GAS05", name: "PiGas", category: "Carburant", lastPaid: "20.0 Pi", avatar: "PG" },
];

const MOCK_CONTACTS = [
  { id: "u1", name: "Amadou", username: "@amadou", avatar: "AM" },
  { id: "u2", name: "Fatou", username: "@fatou", avatar: "FA" },
  { id: "u3", name: "Ibrahim", username: "@ibrahim", avatar: "IB" },
  { id: "u4", name: "Aissatou", username: "@aissa", avatar: "AI" },
  { id: "u5", name: "Moussa", username: "@moussa", avatar: "MO" },
];

const MOCK_HISTORY = [
  { id: "tx1", type: "sent", to: "PimShop", amount: "2.5", date: "Aujourd'hui, 14:30", status: "success" },
  { id: "tx2", type: "received", from: "Amadou", amount: "10.0", date: "Aujourd'hui, 12:15", status: "success" },
  { id: "tx3", type: "sent", to: "PiFood", amount: "8.0", date: "Hier, 20:45", status: "success" },
  { id: "tx4", type: "sent", to: "Fatou", amount: "5.0", date: "Hier, 18:00", status: "success" },
  { id: "tx5", type: "received", from: "Ibrahim", amount: "25.0", date: "12 Fev, 09:30", status: "success" },
  { id: "tx6", type: "sent", to: "TechPi", amount: "15.0", date: "11 Fev, 16:20", status: "pending" },
  { id: "tx7", type: "received", from: "PiMarket", amount: "3.2", date: "10 Fev, 11:00", status: "success" },
  { id: "tx8", type: "sent", to: "Moussa", amount: "50.0", date: "9 Fev, 08:45", status: "failed" },
];

type ActiveView = "hub" | "scanner" | "receive" | "pay-merchant";

export default function MPayPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ActiveView>("hub");
  const [userBalance, setUserBalance] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [isOnline, setIsOnline] = useState(true);

  // Payment flow states
  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [payStep, setPayStep] = useState(1); // 1: search, 2: amount, 3: confirm
  const [isLoading, setIsLoading] = useState(false);
  const [txPriority, setTxPriority] = useState("fast");

  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user?.balances) {
          setUserBalance(data.user.balances.pi || 0);
        }
      })
      .catch(() => setUserBalance(0));
  }, []);

  // Notification polling
  useEffect(() => {
    const interval = setInterval(() => {
      const newNotif = Math.random() > 0.7;
      if (newNotif) {
        setNotifications(prev => prev + 1);
        toast("Nouveau paiement recu", {
          description: `+${(Math.random() * 10).toFixed(2)} Pi de ${MOCK_CONTACTS[Math.floor(Math.random() * MOCK_CONTACTS.length)].name}`,
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleQRResult = useCallback((data: string) => {
    if (data) {
      setMerchantId(data);
      setActiveView("pay-merchant");
      setPayStep(2);
      toast.success("Marchand detecte: " + data);
    } else {
      setActiveView("hub");
    }
  }, []);

  const handleMerchantTap = (id: string) => {
    setMerchantId(id);
    setActiveView("pay-merchant");
    setPayStep(2);
  };

  const handlePayStep = () => {
    if (payStep === 1 && merchantId.length < 3) {
      return toast.error("Identifiant marchand invalide");
    }
    if (payStep === 2 && (parseFloat(amount) <= 0 || !amount)) {
      return toast.error("Veuillez entrer un montant");
    }
    if (payStep === 2 && parseFloat(amount) > userBalance) {
      return toast.error("Solde insuffisant");
    }
    setPayStep(payStep + 1);
  };

  const executePayment = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      toast.success("Transaction mPay confirmee !");
      router.push(`/mpay/success?amount=${amount}&to=${merchantId}&txid=TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`);
    } catch {
      toast.error("Echec du consensus reseau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  // QR Scanner View
  if (activeView === "scanner") {
    return <QRScanner onClose={handleQRResult} />;
  }

  // Receive QR View
  if (activeView === "receive") {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between">
          <button onClick={() => setActiveView("hub")} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Recevoir</h1>
          <div className="w-11" />
        </header>
        <div className="px-6 pt-4">
          <ReceiveQR userIdentifier="PIMPAY-USER-001" />
        </div>
      </div>
    );
  }

  // Pay Merchant Flow (Bottom Sheet style)
  if (activeView === "pay-merchant") {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
          <button
            onClick={() => {
              if (payStep > 1) {
                setPayStep(payStep - 1);
              } else {
                setActiveView("hub");
                setMerchantId("");
                setAmount("");
                setPayStep(1);
              }
            }}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">Payer Marchand</h1>
            <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">
              {"Etape " + payStep + " / 3"}
            </p>
          </div>
          <button
            onClick={() => { setActiveView("hub"); setMerchantId(""); setAmount(""); setPayStep(1); }}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </header>

        <main className="px-6 pt-8 pb-32">
          {/* Step 1: Search merchant */}
          {payStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative group cursor-pointer" onClick={() => setActiveView("scanner")}>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center backdrop-blur-md">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-4 shadow-2xl">
                      <Scan size={36} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Scanner QR mPay</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Ouvrir la camera</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ou rechercher</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-blue-500/50 transition-all">
                <div className="p-4 bg-white/5 rounded-2xl text-slate-400">
                  <Store size={20} />
                </div>
                <input
                  type="text"
                  placeholder="ID MARCHAND"
                  className="bg-transparent flex-1 outline-none font-black text-sm uppercase placeholder:text-slate-700"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
                <button onClick={handlePayStep} className="bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20">
                  <Search size={20} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {payStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden backdrop-blur-md">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20">
                    <Cpu size={24} />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{merchantId || "MARCHAND PIMPAY"}</span>
                </div>

                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant du Transfert</div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-4xl font-black text-blue-500">Pi</span>
                  <span className="text-5xl font-black tracking-tighter">{amount || "0"}</span>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center px-2">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-500 uppercase">Solde</p>
                    <p className="text-sm font-black text-emerald-400">{userBalance.toLocaleString()} Pi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase">Frais</p>
                    <p className="text-sm font-black text-white">0.00 Pi</p>
                  </div>
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className="h-14 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                  >
                    {key === "delete" ? <Delete size={20} className="text-red-500" /> : key}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["low", "fast", "instant"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setTxPriority(p)}
                    className={`py-3 rounded-2xl border text-[9px] font-black uppercase transition-all ${txPriority === p ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-slate-500"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePayStep}
                className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
              >
                Verifier la Transaction
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {payStep === 3 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck size={120} />
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[3px] text-blue-500 mb-1">Resume</h2>
                    <p className="text-2xl font-black uppercase">Signature</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
                    <p className="text-2xl font-black text-white">{amount} Pi</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Marchand</span>
                    <span className="font-black text-xs text-blue-400 uppercase">{merchantId}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Protocole</span>
                    <span className="font-black text-xs uppercase">PimPay mPay</span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Priorite</span>
                    <span className="font-black text-xs uppercase text-emerald-400">{txPriority}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
                    <Fingerprint size={32} />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Signature biometrique requise</p>
                </div>
              </div>

              <button
                onClick={executePayment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                {isLoading ? "Broadcasting..." : "Signer & Envoyer"}
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <div className="fixed bottom-8 left-0 right-0 px-8">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 text-slate-400">
              <Landmark size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">mPay Protocol</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8px] font-black text-emerald-500 uppercase">Online</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN HUB VIEW
  // ============================================
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter">mPay</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[2px]">{isOnline ? "Reseau actif" : "Hors ligne"}</p>
          </div>
        </div>
        <button
          onClick={() => { setNotifications(0); router.push("/notifications"); }}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all relative"
        >
          <Bell size={20} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-[#020617]">
              {notifications}
            </span>
          )}
        </button>
      </header>

      <main className="px-6 pt-6 pb-32 space-y-8">

        {/* BALANCE CARD */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solde mPay</span>
              </div>
              <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                {balanceVisible ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-400" />}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              {balanceVisible ? (
                <>
                  <span className="text-4xl font-black tracking-tighter">{userBalance.toLocaleString()}</span>
                  <span className="text-lg font-black text-blue-500">Pi</span>
                </>
              ) : (
                <span className="text-4xl font-black tracking-tighter text-slate-600">{"* * * * *"}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">+12.5% ce mois</span>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Scan, label: "Scanner", color: "from-blue-600 to-blue-700", action: () => setActiveView("scanner") },
              { icon: Store, label: "Payer", color: "from-indigo-600 to-indigo-700", action: () => { setActiveView("pay-merchant"); setPayStep(1); } },
              { icon: Send, label: "Envoyer", color: "from-cyan-600 to-cyan-700", action: () => router.push("/mpay/send") },
              { icon: QrCode, label: "Recevoir", color: "from-emerald-600 to-emerald-700", action: () => setActiveView("receive") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg group-active:scale-90 transition-all`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* FAVORITE MERCHANTS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Marchands recents</h2>
            </div>
            <button className="text-[9px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1">
              Tout voir <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {MOCK_MERCHANTS.map((merchant) => (
              <button
                key={merchant.id}
                onClick={() => handleMerchantTap(merchant.id)}
                className="flex-shrink-0 w-[120px] bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:bg-white/[0.06] active:scale-95 transition-all"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <span className="text-xs font-black text-blue-400">{merchant.avatar}</span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-tight text-white">{merchant.name}</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase">{merchant.category}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* P2P CONTACTS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Contacts P2P</h2>
            </div>
            <button
              onClick={() => router.push("/mpay/send")}
              className="text-[9px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"
            >
              Tout voir <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <button
              onClick={() => router.push("/mpay/send")}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                <Plus size={20} className="text-slate-400" />
              </div>
              <span className="text-[8px] font-bold text-slate-600 uppercase">Nouveau</span>
            </button>
            {MOCK_CONTACTS.map((contact) => (
              <button
                key={contact.id}
                onClick={() => router.push(`/mpay/send?to=${contact.username}`)}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 group-active:scale-90 transition-all">
                  <span className="text-xs font-black text-cyan-400">{contact.avatar}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-500 uppercase">{contact.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* TRANSACTION HISTORY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Historique</h2>
            </div>
            <button
              onClick={() => router.push("/mpay/statistics")}
              className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500 uppercase tracking-wider"
            >
              <BarChart3 size={12} /> Stats
            </button>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
            {MOCK_HISTORY.map((tx) => (
              <button
                key={tx.id}
                onClick={() => router.push(`/mpay/details?txid=${tx.id}&amount=${tx.amount}&to=${tx.type === "sent" ? tx.to : tx.from}&method=wallet`)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "sent" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {tx.type === "sent" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-black uppercase tracking-tight">{tx.type === "sent" ? tx.to : tx.from}</p>
                  <p className="text-[9px] font-bold text-slate-600">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${tx.type === "sent" ? "text-red-400" : "text-emerald-400"}`}>
                    {tx.type === "sent" ? "-" : "+"}{tx.amount} Pi
                  </p>
                  <p className={`text-[8px] font-black uppercase ${tx.status === "success" ? "text-emerald-500/60" : tx.status === "pending" ? "text-amber-500/60" : "text-red-500/60"}`}>
                    {tx.status === "success" ? "Confirme" : tx.status === "pending" ? "En cours" : "Echoue"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER STATUS BAR */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">mPay Node Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
