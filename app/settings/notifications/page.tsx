"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trash2, ArrowLeft, RefreshCcw,
  CheckCheck, Info, ShieldCheck, ArrowDownLeft,
  ArrowUpRight, Store, LogIn, Clock, Loader2,
  Smartphone, Globe, MapPin, Repeat, User, Building2, Wifi
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NotificationType = "SECURITY" | "PAYMENT_RECEIVED" | "PAYMENT_SENT" | "MERCHANT" | "LOGIN" | "SYSTEM" | "SWAP" | "SUCCESS" | "KYC" | "KYC_APPROVED" | "KYC_REJECTED" | "KYC_PENDING" | string;

// Helper pour formater les montants PI avec 8 decimales maximum
function formatPiAmount(amount: number | undefined, currency?: string): string {
  if (amount === undefined || amount === null) return "0";
  const curr = (currency || "PI").toUpperCase();
  // Pour PI, afficher jusqu'a 8 decimales significatives
  if (curr === "PI") {
    // Supprimer les zeros de fin
    const formatted = Number(amount).toFixed(8).replace(/\.?0+$/, "");
    return formatted || "0";
  }
  // Pour les autres devises, utiliser toLocaleString classique
  return Number(amount).toLocaleString();
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  metadata?: {
    device?: string;
    ip?: string;
    location?: string;
    os?: string;
    browser?: string;
    fromCurrency?: string;
    toCurrency?: string;
    fromAmount?: number;
    toAmount?: number;
    rate?: number;
    reference?: string;
    // Champs pour les transactions (depot, envoi, reception)
    amount?: number;
    currency?: string;
    senderName?: string;
    senderUsername?: string;
    recipientName?: string;
    recipientUsername?: string;
    method?: string;
    fee?: number;
    status?: string;
    transactionId?: string;
    walletAddress?: string;
    network?: string;
  };
}

// Map devise → nom du réseau blockchain source
const BLOCKCHAIN_NAMES: Record<string, string> = {
  PI:   "Pi Network",
  SDA:  "Sidra Chain",
  BTC:  "Bitcoin Network",
  ETH:  "Ethereum Network",
  BNB:  "BNB Chain",
  SOL:  "Solana Network",
  TRX:  "TRON Network",
  TON:  "TON Blockchain",
  XRP:  "XRP Ledger",
  XLM:  "Stellar Network",
  ADA:  "Cardano Network",
  DOGE: "Dogecoin Network",
  USDT: "USDT Network",
  USDC: "USDC Network",
  DAI:  "DAI Network",
};

// Inférer l'expéditeur et le destinataire depuis le contexte d'une notification
function inferTxParties(notif: Notification): { sender: string; recipient: string } {
  const meta     = notif.metadata;
  const currency = (meta?.currency || "PI").toUpperCase();
  const text     = `${notif.title} ${notif.message}`.toLowerCase();

  // Si les metadata fournissent des noms explicites, on les privilégie
  const explicitSender    = meta?.senderName    || meta?.senderUsername    || null;
  const explicitRecipient = meta?.recipientName || meta?.recipientUsername || null;

  // Adresse wallet externe → nom de réseau
  const networkName = BLOCKCHAIN_NAMES[currency] || `${currency} Network`;

  // Catégories de services détectés dans le texte
  const isCard    = text.includes("carte") || text.includes("card") || text.includes("visa") || text.includes("mastercard");
  const isAirtel  = text.includes("airtel");
  const isMtn     = text.includes("mtn");
  const isMoMo    = text.includes("mobile money") || text.includes("momo");
  const isWave    = text.includes("wave");
  const isPaypal  = text.includes("paypal");
  const isSwap    = text.includes("swap") || text.includes("exchange") || text.includes("conversion");
  const isDeposit = text.includes("depot") || text.includes("deposit") || text.includes("dépôt") || text.includes("recharge") || text.includes("réception");
  const isWithdraw= text.includes("retrait") || text.includes("withdraw") || text.includes("cashout");
  const isRecharge= text.includes("recharge") || text.includes("top-up");
  const isPayment = text.includes("paiement") || text.includes("payment") || text.includes("achat");

  const serviceName = isCard   ? "Recharge Carte"
    : isAirtel  ? "Airtel Money"
    : isMtn     ? "MTN Mobile Money"
    : isMoMo    ? "Mobile Money"
    : isWave    ? "Wave"
    : isPaypal  ? "PayPal"
    : isSwap    ? "PimPay Exchange"
    : isRecharge? "Operateur Telecom"
    : isPayment ? "Marchand"
    : null;

  if (notif.type === "PAYMENT_RECEIVED" || notif.type === "SUCCESS") {
    // Argent recu : expediteur = source externe ou utilisateur
    const sender    = explicitSender    || serviceName || (isDeposit ? networkName : "PimPay");
    const recipient = explicitRecipient || "Vous";
    return { sender, recipient };
  }

  if (notif.type === "PAYMENT_SENT") {
    // Argent envoye : destinataire = cible externe ou utilisateur
    const sender    = explicitSender    || "Vous";
    const recipient = explicitRecipient || serviceName || (isWithdraw ? networkName : "Destinataire");
    return { sender, recipient };
  }

  // Types generiques avec montant (MERCHANT, SYSTEM, etc.)
  return {
    sender:    explicitSender    || "PimPay",
    recipient: explicitRecipient || "Vous",
  };
}

// Icone et couleur selon qu'il s'agit d'un service externe ou d'un utilisateur
function PartyPill({ label, name, isYou }: { label: string; name: string; isYou?: boolean }) {
  const isExternal = ["network","chain","blockchain","money","wave","paypal","carte","card","marchand","exchange","operateur","airtel","mtn","pimpay"]
    .some(k => name.toLowerCase().includes(k));

  return (
    <div className={`flex-1 rounded-2xl p-3 border ${
      isYou     ? "bg-blue-600/10 border-blue-500/20"
      : isExternal ? "bg-cyan-600/10 border-cyan-500/15"
      : "bg-white/5 border-white/5"
    }`}>
      <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${
        isYou ? "text-blue-400" : isExternal ? "text-cyan-600" : "text-slate-500"
      }`}>{label}</p>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isYou     ? "bg-blue-600/20"
          : isExternal ? "bg-cyan-600/20"
          : "bg-slate-800"
        }`}>
          {isExternal ? <Building2 size={12} className="text-cyan-400" /> : <User size={12} className={isYou ? "text-blue-400" : "text-slate-400"} />}
        </div>
        <p className={`text-[11px] font-bold truncate leading-tight ${
          isYou ? "text-blue-200" : isExternal ? "text-cyan-200" : "text-white"
        }`}>{name}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      
      const data = await res.json();
      
      if (res.ok && isMounted.current) {
        // CORRECTION : Ton API renvoie directement le tableau de notifications
        const notifsArray = Array.isArray(data) ? data : (data.notifications || []);
        setNotifications(notifsArray);
        
        // Calcul manuel du compteur pour être sûr de l'exactitude
        const unread = notifsArray.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Erreur Notifications:", err);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("Tout est lu");
      }
    } catch (e) {
      toast.error("Erreur de synchronisation");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Erreur marquage comme lu:", e);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      toast.error("Suppression échouée");
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "SECURITY": return <ShieldCheck className="text-rose-500" size={18} />;
      case "PAYMENT_RECEIVED": 
      case "SUCCESS": return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case "PAYMENT_SENT": return <ArrowUpRight className="text-blue-400" size={18} />;
      case "SWAP": return <Repeat className="text-indigo-400" size={18} />;
      case "MERCHANT": return <Store className="text-amber-400" size={18} />;
      case "LOGIN": return <LogIn className="text-indigo-400" size={18} />;
      case "SYSTEM": return <Info className="text-blue-500" size={18} />;
      case "KYC":
      case "KYC_APPROVED": return <ShieldCheck className="text-emerald-400" size={18} />;
      case "KYC_REJECTED": return <ShieldCheck className="text-rose-500" size={18} />;
      case "KYC_PENDING": return <ShieldCheck className="text-amber-400" size={18} />;
      default: return <Bell className="text-slate-400" size={18} />;
    }
  };

  const tabs = [
    { id: "ALL", label: "Tout" },
    { id: "SUCCESS", label: "Reçus" },
    { id: "SWAP", label: "Swaps" },
    { id: "LOGIN", label: "Sessions" },
    { id: "SECURITY", label: "Sécurité" },
    { id: "KYC", label: "KYC" },
  ];

  const filteredNotifications = activeTab === "ALL"
    ? notifications
    : notifications.filter(n => {
        if (activeTab === "SUCCESS") return n.type === "SUCCESS" || n.type === "PAYMENT_RECEIVED";
        if (activeTab === "KYC") return n.type === "KYC" || n.type === "KYC_APPROVED" || n.type === "KYC_REJECTED" || n.type === "KYC_PENDING";
        return n.type === activeTab;
      });

  // Notification Detail Modal
  const NotificationDetailModal = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
    const metadata = notification.metadata;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  notification.read ? "bg-slate-800" : "bg-blue-600/20"
                )}>
                  {getIcon(notification.type)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">{notification.title}</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {new Date(notification.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Message</p>
              <p className="text-sm text-white leading-relaxed">{notification.message}</p>
            </div>

            {/* Transaction Details for Payment */}
            {(notification.type === "PAYMENT_RECEIVED" || notification.type === "SUCCESS" || notification.type === "PAYMENT_SENT") && (() => {
              const { sender, recipient } = inferTxParties(notification);
              const isSent = notification.type === "PAYMENT_SENT";
              return (
                <div className="space-y-4">
                  {/* Montant */}
                  {metadata?.amount && (
                    <div className={`rounded-2xl p-4 border ${isSent ? "bg-blue-500/5 border-blue-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Montant</p>
                      <p className={`text-2xl font-black ${isSent ? "text-blue-400" : "text-emerald-400"}`}>
                        {isSent ? "-" : "+"}{formatPiAmount(metadata.amount, metadata.currency)} {metadata.currency || "PI"}
                      </p>
                    </div>
                  )}

                  {/* Expediteur & Destinataire cote a cote */}
                  <div className="flex gap-3">
                    <PartyPill label="Expediteur" name={sender} isYou={isSent} />
                    <PartyPill label="Destinataire" name={recipient} isYou={!isSent} />
                  </div>

                  {/* Réseau / Méthode */}
                  {(metadata?.network || metadata?.method) && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                      <Wifi size={16} className="text-slate-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{metadata?.network ? "Reseau" : "Methode"}</p>
                        <p className="text-sm font-bold text-white">{metadata?.network || metadata?.method}</p>
                      </div>
                    </div>
                  )}

                  {/* Adresse Wallet */}
                  {metadata?.walletAddress && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Adresse Wallet</p>
                      <p className="text-xs font-mono text-slate-300 break-all">{metadata.walletAddress}</p>
                    </div>
                  )}

                  {/* Frais + Statut en ligne */}
                  <div className="flex gap-3">
                    {metadata?.fee && metadata.fee > 0 && (
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Frais</p>
                        <p className="text-sm font-bold text-amber-400">{formatPiAmount(metadata.fee, metadata.currency)} {metadata.currency || "PI"}</p>
                      </div>
                    )}
                    {metadata?.status && (
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Statut</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          metadata.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" :
                          metadata.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{metadata.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Reference */}
                  {(metadata?.reference || metadata?.transactionId) && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
                      <p className="text-xs font-mono text-slate-300">{metadata?.reference || metadata?.transactionId}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Swap Details */}
            {metadata && notification.type === "SWAP" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-rose-500/10 to-emerald-500/10 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Envoye</p>
                      <p className="text-lg font-black text-rose-400">{metadata.fromAmount} {metadata.fromCurrency}</p>
                    </div>
                    <Repeat size={20} className="text-slate-600" />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recu</p>
                      <p className="text-lg font-black text-emerald-400">{metadata.toAmount} {metadata.toCurrency}</p>
                    </div>
                  </div>
                </div>

                {metadata.rate && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Taux de change</p>
                    <p className="text-sm font-bold text-white">1 {metadata.fromCurrency} = {Number(metadata.rate).toFixed(4)} {metadata.toCurrency}</p>
                  </div>
                )}

                {metadata.reference && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reference</p>
                    <p className="text-xs font-mono text-slate-300">{metadata.reference}</p>
                  </div>
                )}
              </div>
            )}

            {/* Session/Security Details */}
            {metadata && (notification.type === "LOGIN" || notification.type === "SECURITY") && (
              <div className="space-y-4">
                {metadata.device && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Appareil</p>
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.device}</p>
                    </div>
                  </div>
                )}

                {metadata.ip && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Adresse IP</p>
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.ip}</p>
                    </div>
                  </div>
                )}

                {metadata.location && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Localisation</p>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.location}</p>
                    </div>
                  </div>
                )}

                {metadata.os && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Systeme</p>
                    <p className="text-sm font-bold text-white">{metadata.os} {metadata.browser ? `- ${metadata.browser}` : ''}</p>
                  </div>
                )}
              </div>
            )}

            {/* Delete Button */}
            <button 
              onClick={() => { deleteNotif(notification.id); onClose(); }}
              className="w-full py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Supprimer cette notification
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationDetailModal 
            notification={selectedNotification} 
            onClose={() => setSelectedNotification(null)} 
          />
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-4 sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">Notifications</h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[3px] mt-1">
              {unreadCount > 0 ? `${unreadCount} non lues` : "Tout est lu"}
            </p>
          </div>
          <button onClick={() => fetchNotifications()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                activeTab === tab.id
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                  : "bg-white/5 border-white/5 text-slate-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button onClick={markAllAsRead} className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 rounded-2xl border border-white/5 hover:text-blue-400 transition-all">
          <CheckCheck size={14} /> Tout marquer comme lu
        </button>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Chargement...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Bell size={40} className="text-slate-800 mb-6" />
            <p className="text-base font-bold text-slate-400 italic">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    setSelectedNotification(notif);
                  }}
                  className={cn(
                    "relative p-5 rounded-[30px] border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                    notif.read
                      ? "bg-slate-900/30 border-white/5 opacity-70 hover:opacity-90"
                      : "bg-gradient-to-br from-blue-600/10 to-slate-900/50 border-blue-500/20 shadow-lg hover:border-blue-500/40"
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      notif.read ? "bg-slate-800" : "bg-blue-600/20 text-blue-400"
                    )}>
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={cn("text-sm font-bold truncate pr-4", notif.read ? 'text-slate-400' : 'text-white')}>
                          {notif.title}
                        </h3>
                        {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                      </div>

                      <p className={cn("text-xs mt-1 leading-relaxed", notif.read ? 'text-slate-500' : 'text-slate-300')}>
                        {notif.message}
                      </p>

                      {/* Métadonnées de session si disponibles */}
                      {notif.metadata && (notif.type === "LOGIN" || notif.type === "SECURITY") && (
                        <div className="mt-3 p-3 bg-black/40 rounded-2xl space-y-1 border border-white/5">
                           {notif.metadata.device && (
                             <div className="flex items-center gap-2 text-[10px] text-slate-400">
                               <Smartphone size={10} /> {notif.metadata.device}
                             </div>
                           )}
                           {notif.metadata.ip && (
                             <div className="flex items-center gap-2 text-[10px] text-slate-400">
                               <Globe size={10} /> {notif.metadata.ip}
                             </div>
                           )}
                           {notif.metadata.location && (
                             <div className="flex items-center gap-2 text-[10px] text-slate-400">
                               <MapPin size={10} /> {notif.metadata.location}
                             </div>
                           )}
                        </div>
                      )}

                      {/* Métadonnées de swap si disponibles */}
                      {notif.metadata && notif.type === "SWAP" && (
                        <div className="mt-3 p-3 bg-black/40 rounded-2xl space-y-2 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-rose-500/20 rounded-lg flex items-center justify-center">
                                <ArrowUpRight size={10} className="text-rose-400" />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Envoye</span>
                                <p className="text-xs font-bold text-white">{notif.metadata.fromAmount} {notif.metadata.fromCurrency}</p>
                              </div>
                            </div>
                            <Repeat size={14} className="text-slate-600" />
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider text-right block">Recu</span>
                                <p className="text-xs font-bold text-emerald-400">{notif.metadata.toAmount} {notif.metadata.toCurrency}</p>
                              </div>
                              <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <ArrowDownLeft size={10} className="text-emerald-400" />
                              </div>
                            </div>
                          </div>
                          {notif.metadata.rate && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-white/5">
                              <Info size={10} />
                              <span>Taux: 1 {notif.metadata.fromCurrency} = {Number(notif.metadata.rate).toFixed(4)} {notif.metadata.toCurrency}</span>
                            </div>
                          )}
                          {notif.metadata.reference && (
                            <div className="text-[9px] text-slate-600 font-mono">
                              Ref: {notif.metadata.reference}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Métadonnées de paiement recu / envoye — toujours afficher expediteur + destinataire */}
                      {(notif.type === "PAYMENT_RECEIVED" || notif.type === "SUCCESS" || notif.type === "PAYMENT_SENT") && (() => {
                        const { sender, recipient } = inferTxParties(notif);
                        const isSent = notif.type === "PAYMENT_SENT";
                        return (
                          <div className={`mt-3 p-3 bg-black/40 rounded-2xl space-y-2 border ${isSent ? "border-blue-500/10" : "border-emerald-500/10"}`}>
                            {/* Montant */}
                            {notif.metadata?.amount && (
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSent ? "bg-blue-500/20" : "bg-emerald-500/20"}`}>
                                  {isSent ? <ArrowUpRight size={14} className="text-blue-400" /> : <ArrowDownLeft size={14} className="text-emerald-400" />}
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{isSent ? "Montant envoye" : "Montant recu"}</span>
                                  <p className={`text-sm font-black ${isSent ? "text-blue-400" : "text-emerald-400"}`}>
                                    {isSent ? "-" : "+"}{formatPiAmount(notif.metadata.amount, notif.metadata.currency)} {notif.metadata.currency || "PI"}
                                  </p>
                                </div>
                              </div>
                            )}
                            {/* Expediteur → Destinataire */}
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest">De</p>
                                <p className="text-[10px] font-bold text-white truncate">{sender}</p>
                              </div>
                              <ArrowUpRight size={12} className="text-slate-600 shrink-0" />
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest">Vers</p>
                                <p className="text-[10px] font-bold text-white truncate">{recipient}</p>
                              </div>
                            </div>
                            {/* Ref */}
                            {(notif.metadata?.reference || notif.metadata?.transactionId) && (
                              <div className="text-[9px] text-slate-600 font-mono pt-1 border-t border-white/5">
                                Ref: {notif.metadata?.reference || notif.metadata?.transactionId}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Métadonnées KYC */}
                      {(notif.type === "KYC" || notif.type === "KYC_APPROVED" || notif.type === "KYC_REJECTED" || notif.type === "KYC_PENDING") && (
                        <div className={`mt-3 p-3 rounded-2xl space-y-2 border ${
                          notif.type === "KYC_APPROVED" || (notif.type === "KYC" && notif.metadata?.status === "APPROVED")
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : notif.type === "KYC_REJECTED" || (notif.type === "KYC" && notif.metadata?.status === "REJECTED")
                            ? "bg-rose-500/5 border-rose-500/20"
                            : "bg-amber-500/5 border-amber-500/20"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              notif.type === "KYC_APPROVED" || notif.metadata?.status === "APPROVED"
                                ? "bg-emerald-500/20"
                                : notif.type === "KYC_REJECTED" || notif.metadata?.status === "REJECTED"
                                ? "bg-rose-500/20"
                                : "bg-amber-500/20"
                            }`}>
                              <ShieldCheck size={16} className={
                                notif.type === "KYC_APPROVED" || notif.metadata?.status === "APPROVED"
                                  ? "text-emerald-400"
                                  : notif.type === "KYC_REJECTED" || notif.metadata?.status === "REJECTED"
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              } />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Statut KYC</span>
                              <p className={`text-xs font-black uppercase ${
                                notif.type === "KYC_APPROVED" || notif.metadata?.status === "APPROVED"
                                  ? "text-emerald-400"
                                  : notif.type === "KYC_REJECTED" || notif.metadata?.status === "REJECTED"
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              }`}>
                                {notif.type === "KYC_APPROVED" || notif.metadata?.status === "APPROVED"
                                  ? "Verifie"
                                  : notif.type === "KYC_REJECTED" || notif.metadata?.status === "REJECTED"
                                  ? "Rejete"
                                  : "En attente"}
                              </p>
                            </div>
                          </div>
                          {notif.metadata?.reference && (
                            <div className="text-[9px] text-slate-600 font-mono pt-1 border-t border-white/5">
                              Ref: {notif.metadata.reference}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Métadonnées generiques pour autres types avec metadata.amount */}
                      {notif.metadata && !["LOGIN", "SECURITY", "SWAP", "PAYMENT_RECEIVED", "SUCCESS", "PAYMENT_SENT"].includes(notif.type) && notif.metadata.amount && (
                        <div className="mt-3 p-3 bg-black/40 rounded-2xl space-y-2 border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-500/20 rounded-xl flex items-center justify-center">
                              <Info size={14} className="text-slate-400" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Montant</span>
                              <p className="text-sm font-black text-white">
                                {Number(notif.metadata.amount).toLocaleString()} {notif.metadata.currency || "PI"}
                              </p>
                            </div>
                          </div>
                          {notif.metadata.method && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-white/5">
                              <Info size={10} />
                              <span>Methode: {notif.metadata.method}</span>
                            </div>
                          )}
                          {notif.metadata.status && (
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                notif.metadata.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" :
                                notif.metadata.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                {notif.metadata.status}
                              </span>
                            </div>
                          )}
                          {(notif.metadata.reference || notif.metadata.transactionId) && (
                            <div className="text-[9px] text-slate-600 font-mono">
                              Ref: {notif.metadata.reference || notif.metadata.transactionId}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock size={10} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">
                            {new Date(notif.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <button onClick={() => deleteNotif(notif.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
