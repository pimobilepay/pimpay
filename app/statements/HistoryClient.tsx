"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, Search, ArrowUpRight, ArrowDownLeft,
  Calendar, CircleDot, Wallet, ArrowRightLeft, Smartphone, Zap, FileText,
  User, ChevronDown, ChevronUp, Send, Download, CreditCard, RefreshCw, BatteryCharging, ExternalLink
} from "lucide-react";
import { getBlockchainTxUrl, getExplorerName, hasBlockchainExplorer } from "@/lib/blockchain-explorer";
import Link from "next/link";
import { format, subDays, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

/** Types locaux pour l'historique des transactions */
interface TransactionUser {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  name?: string;
  email?: string;
}

interface RawTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | Date;
  fromUserId?: string | null;
  toUserId?: string | null;
  fromUser?: TransactionUser | null;
  toUser?: TransactionUser | null;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  purpose?: string;
  fee?: number;
  netAmount?: number | null;
  note?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  blockchainTx?: string | null;
}

interface FormattedTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  reference?: string | null;
  title?: string;
  fee?: number;
  netAmount?: number | null;
  isIncome?: boolean;
  fromName?: string;
  fromUsername?: string | null;
  fromEmail?: string | null;
  fromPhone?: string | null;
  toName?: string;
  toUsername?: string | null;
  toEmail?: string | null;
  toPhone?: string | null;
  note?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  blockchainTxHash?: string | null;
}

interface HistoryStats {
  total?: number;
  income?: number;
  outcome?: unknown;
  expense?: number;
  count?: number;
  [key: string]: unknown;
}



export default function HistoryClient({ initialTransactions, stats, currentUserId }: { initialTransactions: RawTransaction[]; stats: HistoryStats; currentUserId: string }) {
  const router = useRouter();
  const [referenceSearch, setReferenceSearch] = useState("");
  const [activeService, setActiveService] = useState("all");
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());

  // Résoudre le nom affiché d'un user
  const resolveUserName = (user: TransactionUser | null | undefined): string | null => {
    if (!user) return null;
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.username || user.name || user.email || null;
  };

  // Inférer l'expéditeur ou le destinataire depuis le contexte de la transaction
  const inferPartyName = (tx: RawTransaction, role: "from" | "to"): string => {
    const purpose     = (tx.purpose     || "").toLowerCase();
    const description = (tx.description || "").toLowerCase();
    const reference   = (tx.reference   || "").toLowerCase();
    const combined    = `${purpose} ${description} ${reference}`;
    const currency    = (tx.currency    || "").toUpperCase();
    const isIncome    = tx.toUserId === currentUserId;

    // Réseau/blockchain selon la devise
    const blockchainName: Record<string, string> = {
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
      USDT: combined.includes("tron") || combined.includes("trx") ? "TRON Network" : "USDT Network",
      USDC: "USDC Network",
      DAI:  "DAI Network",
    };

    // Depot blockchain externe → l'expéditeur est le réseau blockchain
    const isBlockchainDeposit =
      combined.includes("depot") || combined.includes("deposit") ||
      combined.includes("dépôt") || combined.includes("réception") ||
      (isIncome && !tx.fromUser);

    const isBlockchainWithdraw =
      combined.includes("retrait") || combined.includes("withdraw") ||
      combined.includes("cashout") || (!isIncome && !tx.toUser);

    // Recharge de carte / service mobile money
    if (combined.includes("carte") || combined.includes("card") || combined.includes("visa") || combined.includes("mastercard")) {
      return role === "from" ? "Recharge Carte" : "PimPay Card";
    }
    if (combined.includes("mobile money") || combined.includes("momo") || combined.includes("airtel") || combined.includes("mtn")) {
      const op = combined.includes("airtel") ? "Airtel Money"
               : combined.includes("mtn")    ? "MTN Mobile Money"
               : "Mobile Money";
      return role === "from" ? op : "PimPay Wallet";
    }
    if (combined.includes("wave")) {
      return role === "from" ? "Wave" : "PimPay Wallet";
    }
    if (combined.includes("paypal")) {
      return role === "from" ? "PayPal" : "PimPay Wallet";
    }
    // Swap / exchange interne
    if (combined.includes("swap") || combined.includes("exchange") || combined.includes("conversion") || combined.includes("convert")) {
      return role === "from" ? "PimPay Exchange" : "PimPay Wallet";
    }
    // Depot ou réception depuis blockchain
    if (role === "from" && isBlockchainDeposit && !tx.fromUser) {
      return blockchainName[currency] || `${currency} Network`;
    }
    // Retrait vers blockchain
    if (role === "to" && isBlockchainWithdraw && !tx.toUser) {
      return blockchainName[currency] || `${currency} Network`;
    }
    // Transfert PimPay interne
    if (combined.includes("pimpay") || combined.includes("pim-pay") || combined.includes("transfer")) {
      return role === "from" ? "PimPay" : "PimPay";
    }
    // Recharge téléphone
    if (combined.includes("recharge") || combined.includes("top-up") || combined.includes("topup")) {
      return role === "from" ? "PimPay Wallet" : "Opérateur Télécom";
    }
    // Paiement marchand
    if (combined.includes("paiement") || combined.includes("payment") || combined.includes("achat") || combined.includes("purchase")) {
      return role === "from" ? "PimPay Wallet" : "Marchand";
    }

    return role === "from" ? "PimPay" : "PimPay";
  };

  // Mapping des transactions
  const formattedTransactions = useMemo(() => {
    return initialTransactions.map((tx: RawTransaction) => {
      const isIncome = tx.toUserId === currentUserId;

      let type = "transfer";
      const purpose = (tx.purpose || "").toLowerCase();
      const description = (tx.description || "").toLowerCase();
      const combined = `${purpose} ${description}`;
      
      if (combined.includes("recharge") || combined.includes("top-up") || combined.includes("topup")) {
        type = "recharge";
      } else if (combined.includes("retrait") || combined.includes("withdraw") || combined.includes("cashout")) {
        type = "withdraw";
      } else if (combined.includes("dépôt") || combined.includes("depot") || combined.includes("deposit")) {
        type = "deposit";
      } else if (combined.includes("paiement") || combined.includes("payment") || combined.includes("achat") || combined.includes("purchase")) {
        type = "payment";
      } else if (combined.includes("swap") || combined.includes("exchange") || combined.includes("conversion") || combined.includes("convert")) {
        type = "swap";
      } else if (combined.includes("incoming") || combined.includes("réception") || combined.includes("received")) {
        type = "incoming";
      } else if (combined.includes("outgoing") || combined.includes("envoi") || combined.includes("sent")) {
        type = "outgoing";
      }

      const currency = (tx.currency || "XAF").toUpperCase();

      const fromName = resolveUserName(tx.fromUser) ?? inferPartyName(tx, "from");
      const toName   = resolveUserName(tx.toUser)   ?? inferPartyName(tx, "to");

      return {
        id: tx.id,
        reference: tx.reference || null,
        title: tx.description || tx.purpose || (isIncome ? "Réception" : "Envoi"),
        type,
        amount: tx.amount,
        fee: tx.fee || 0,
        netAmount: tx.netAmount ?? null,
        currency,
        date: format(new Date(tx.createdAt), "d MMM yyyy, HH:mm", { locale: fr }),
        status:
          tx.status?.toLowerCase() === "completed" || tx.status?.toLowerCase() === "success"
            ? "success"
            : tx.status?.toLowerCase() === "failed"
            ? "failed"
            : "pending",
        isIncome,
        // Expéditeur / Destinataire
        fromName,
        fromUsername: tx.fromUser?.username || null,
        fromEmail:    tx.fromUser?.email    || null,
        fromPhone:    tx.fromUser?.phone    || null,
        toName,
        toUsername:   tx.toUser?.username   || null,
        toEmail:      tx.toUser?.email      || null,
        toPhone:      tx.toUser?.phone      || null,
        // Extra
        note: tx.note || null,
        accountName:   tx.accountName   || null,
        accountNumber: tx.accountNumber || null,
        // Blockchain
        blockchainTxHash: (typeof tx.blockchainTx === 'string' ? tx.blockchainTx : typeof tx.metadata?.blockchainTxHash === 'string' ? tx.metadata.blockchainTxHash : null),
      };
    });
  }, [initialTransactions, currentUserId]);

  const filteredTransactions = useMemo(() => {
    return formattedTransactions.filter((tx) => {
      const matchesService = activeService === "all" || tx.type === activeService;
      const matchesReference =
        !referenceSearch ||
        (tx.reference &&
          tx.reference.toLowerCase().includes(referenceSearch.toLowerCase()));

      const rawTx = initialTransactions.find((t: RawTransaction) => t.id === tx.id);
      const txDate = rawTx?.createdAt ? new Date(rawTx.createdAt) : new Date();
      const matchesDate =
        (!startDate || txDate >= startDate) &&
        (!endDate   || txDate <= endOfDay(endDate));

      return matchesService && matchesReference && matchesDate;
    });
  }, [activeService, referenceSearch, startDate, endDate, formattedTransactions, initialTransactions]);

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error("Aucune transaction à exporter");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Rapport d'historique des transactions - PimPay", pageWidth / 2, 14, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateRange = `Période : ${startDate ? format(startDate, "dd/MM/yyyy") : "..."} → ${endDate ? format(endDate, "dd/MM/yyyy") : "..."}`;
    doc.text(dateRange, pageWidth / 2, 20, { align: "center" });

    const tableData = filteredTransactions.map((tx) => [
      tx.reference || "N/A",
      tx.type === "deposit" ? "Dépôt" : tx.type === "withdraw" ? "Retrait" : tx.type === "transfer" ? "Transfert" : "Recharge",
      tx.fromName || "",
      tx.toName || "",
      tx.date,
      `${tx.isIncome ? "+" : "-"}${tx.amount.toFixed((tx.currency === "PI" || tx.currency === "SDA") ? 8 : 2)} ${tx.currency}`,
      (tx.fee ?? 0) >= 0 ? `${(tx.fee ?? 0).toFixed((tx.currency === "PI" || tx.currency === "SDA") ? 8 : 4)} ${tx.currency}` : "—",
      tx.status === "success" ? "Complété" : tx.status === "pending" ? "En attente" : "Échoué",
    ]);

    autoTable(doc, {
      head: [["Référence", "Type", "Expéditeur", "Destinataire", "Date", "Montant", "Frais", "Statut"]],
      body: tableData,
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: 50, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: 10,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 26;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${filteredTransactions.length} transaction(s) — Généré le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 10, finalY + 10);

    doc.save(`pimpay_statements_${format(new Date(), "ddMMyyyy_HHmm")}.pdf`);
    toast.success("Rapport PDF exporté !");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">

      {/* HEADER */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                <ArrowLeft size={20} />
              </div>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">Statements</h1>
              <div className="flex items-center gap-2 mt-1">
                <CircleDot size={10} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">REAL-TIME LEDGER</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20 transition-all"
            title="Exporter en PDF"
          >
            <FileText size={20} />
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          <StatMiniCard
            label="Entrées"
            value={`+${(stats.income ?? 0).toLocaleString()} ${filteredTransactions[0]?.currency || ""}`}
            icon={<ArrowDownLeft size={16} />}
            color="text-green-400"
            bg="from-green-600/20"
          />
          <StatMiniCard
            label="Sorties"
            value={`-${(Number(stats.outcome) ?? 0).toLocaleString()} ${filteredTransactions[0]?.currency || ""}`}
            icon={<ArrowUpRight size={16} />}
            color="text-red-400"
            bg="from-red-600/20"
          />
        </div>
      </div>

      <div className="px-6 space-y-5">

        {/* RECHERCHE PAR RÉFÉRENCE */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input
            value={referenceSearch}
            onChange={(e) => setReferenceSearch(e.target.value)}
            className="w-full h-13 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold outline-none focus:border-emerald-500/40 text-white placeholder:text-slate-600 transition-colors"
            placeholder="Rechercher par référence..."
          />
        </div>

        {/* FILTRES PAR DATE */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[2px] px-1">Période</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
              <input
                type="date"
                value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                className="w-full h-12 bg-slate-900/50 border border-white/5 rounded-xl pl-9 pr-3 text-xs font-bold outline-none focus:border-blue-500/30 text-white [color-scheme:dark]"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
              <input
                type="date"
                value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : new Date())}
                className="w-full h-12 bg-slate-900/50 border border-white/5 rounded-xl pl-9 pr-3 text-xs font-bold outline-none focus:border-blue-500/30 text-white [color-scheme:dark]"
              />
            </div>
          </div>
          <button
            onClick={() => { setStartDate(subDays(new Date(), 30)); setEndDate(new Date()); }}
            className="w-full text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest py-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20"
          >
            30 derniers jours
          </button>
        </div>

        {/* FILTRES PAR TYPE */}
        <div className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[2px] px-1">Type</h4>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all",      label: "Tout" },
              { id: "incoming", label: "Entrants" },
              { id: "outgoing", label: "Sortants" },
              { id: "payment",  label: "Paiements" },
              { id: "transfer", label: "Transferts" },
              { id: "swap",     label: "Swaps" },
              { id: "recharge", label: "Recharges" },
              { id: "deposit",  label: "Dépôts" },
              { id: "withdraw", label: "Retraits" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveService(s.id)}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border shrink-0 ${
                  activeService === s.id
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                    : "bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* LISTE */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] flex items-center gap-2">
              <Calendar size={12} className="text-blue-500" />
              {format(endDate, "MMMM yyyy", { locale: fr }).toUpperCase()}
            </h3>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? "s" : ""}
            </span>
          </div>

          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx: FormattedTransaction) => (
              <TransactionItem
                key={tx.id}
                tx={tx}
                onPress={() => {
                  const q = tx.reference
                    ? `ref=${encodeURIComponent(tx.reference)}`
                    : `id=${encodeURIComponent(tx.id)}`;
                  router.push(`/deposit/receipt?${q}`);
                }}
              />
            ))
          ) : (
            <div className="text-center py-14 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
              Aucune transaction trouvée
            </div>
          )}
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

// --- STAT CARD ---
function StatMiniCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-5 rounded-[2rem] h-28 flex flex-col justify-center">
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent opacity-30`} />
      <div className="relative z-10">
        <div className={`flex items-center gap-2 ${color} mb-1`}>
          {icon}
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-lg font-black text-white tracking-tighter truncate leading-none">{value}</p>
      </div>
    </div>
  );
}

// --- TRANSACTION CARD ---
function TransactionItem({ tx, onPress }: { tx: FormattedTransaction; onPress: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const icons: Record<string, React.ReactNode> = {
    transfer: <Send           size={18} className="text-blue-400" />,
    deposit:  <Download       size={18} className="text-green-500" />,
    withdraw: <ArrowUpRight   size={18} className="text-red-400" />,
    recharge: <BatteryCharging size={18} className="text-purple-400" />,
    payment:  <CreditCard     size={18} className="text-amber-400" />,
    swap:     <RefreshCw      size={18} className="text-cyan-400" />,
    incoming: <ArrowDownLeft  size={18} className="text-emerald-400" />,
    outgoing: <ArrowUpRight   size={18} className="text-rose-400" />,
  };

  const statusStyles: Record<string, string> = {
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    failed:  "bg-red-500/10  text-red-400  border-red-500/20",
  };

  const currencyBadge: Record<string, string> = {
    PI:  "bg-amber-500/20  text-amber-400",
    SDA: "bg-emerald-500/20 text-emerald-400",
    BTC: "bg-orange-500/20 text-orange-400",
    XAF: "bg-blue-500/20   text-blue-400",
    XOF: "bg-blue-500/20   text-blue-400",
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden transition-all">

      {/* LIGNE PRINCIPALE — cliquable pour expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors active:scale-[0.99] text-left"
      >
        {/* Icone type */}
        <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center shrink-0">
          {icons[tx.type] || <Zap size={18} className="text-blue-500" />}
        </div>

        {/* Infos centre */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate leading-tight">{tx.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{tx.type}</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[9px] text-slate-500 font-bold">{tx.date}</span>
          </div>
          {tx.reference && (
            <span className="text-[8px] font-mono text-slate-600 mt-0.5 block truncate">#{tx.reference}</span>
          )}
        </div>

        {/* Montant + chevron */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className={`text-base font-black tracking-tighter ${tx.isIncome ? "text-green-400" : "text-white"}`}>
            {tx.isIncome ? "+" : "-"}
            {(tx.currency === "PI" || tx.currency === "SDA") && tx.amount < 0.01
              ? tx.amount.toFixed(8)
              : (tx.currency === "PI" || tx.currency === "SDA")
                ? tx.amount.toFixed(8)
                : tx.amount.toFixed(2)}{" "}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${currencyBadge[tx.currency] || "bg-slate-500/20 text-slate-400"}`}>
              {tx.currency === "PI" ? "π" : tx.currency === "SDA" ? "SDA" : tx.currency}
            </span>
          </p>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${statusStyles[tx.status]}`}>
            {tx.status === "success" ? "Complété" : tx.status === "pending" ? "En attente" : "Échoué"}
          </span>
          {expanded
            ? <ChevronUp size={12} className="text-slate-600 mt-1" />
            : <ChevronDown size={12} className="text-slate-600 mt-1" />
          }
        </div>
      </button>

      {/* DÉTAILS EXPANDABLES */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5">

          {/* FROM / TO */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <PartyCard
              label="Expéditeur"
              name={tx.fromName}
              username={tx.fromUsername}
              email={tx.fromEmail}
              phone={tx.fromPhone}
              isCurrentUser={!tx.isIncome}
            />
            <PartyCard
              label="Destinataire"
              name={tx.toName}
              username={tx.toUsername}
              email={tx.toEmail}
              phone={tx.toPhone}
              isCurrentUser={tx.isIncome}
            />
          </div>

          {/* DONNÉES FINANCIÈRES */}
          <div className="bg-slate-950/60 rounded-2xl p-4 space-y-2">
            <DetailRow label="Montant brut"  value={`${tx.amount.toFixed((tx.currency === "PI" || tx.currency === "SDA") ? 8 : 2)} ${tx.currency}`} />
            {tx.fee >= 0 && (
              <DetailRow label="Frais réseau" value={`${tx.fee.toFixed((tx.currency === "PI" || tx.currency === "SDA") ? 8 : 4)} ${tx.currency}`} accent="text-amber-400" />
            )}
            {tx.netAmount !== null && tx.netAmount !== undefined && (
              <DetailRow label="Montant net"   value={`${Number(tx.netAmount).toFixed((tx.currency === "PI" || tx.currency === "SDA") ? 8 : 2)} ${tx.currency}`} accent="text-green-400" />
            )}
            {tx.reference && (
              <DetailRow label="Référence"    value={tx.reference} mono />
            )}
            {tx.accountName && (
              <DetailRow label="Compte"       value={tx.accountName} />
            )}
            {tx.accountNumber && (
              <DetailRow label="N° compte"    value={tx.accountNumber} mono />
            )}
            {tx.note && (
              <DetailRow label="Note"         value={tx.note} />
            )}
            {tx.blockchainTxHash && (
              <DetailRow label="Hash"         value={tx.blockchainTxHash.slice(0, 16) + "..."} mono accent="text-cyan-400" />
            )}
          </div>

          {/* BLOCKCHAIN EXPLORER LINK */}
          {tx.blockchainTxHash && hasBlockchainExplorer(tx.currency) && (
            <a
              href={getBlockchainTxUrl(tx.currency, tx.blockchainTxHash) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600/20 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={14} />
              Verifier sur {getExplorerName(tx.currency)}
            </a>
          )}

          {/* BOUTON REÇU */}
          <button
            onClick={onPress}
            className="w-full py-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-colors"
          >
            Voir le reçu complet
          </button>
        </div>
      )}
    </div>
  );
}

// Détecter si un nom est un service/réseau externe (pas un utilisateur PimPay)
function isExternalService(name: string): boolean {
  const services = [
    "network", "chain", "blockchain", "ledger", "exchange",
    "mobile money", "wave", "paypal", "carte", "card", "visa", "mastercard",
    "airtel", "mtn", "opérateur", "marchand", "pimpay exchange", "pimpay card",
    "bitcoin", "ethereum", "solana", "tron", "stellar",
  ];
  return services.some((s) => name.toLowerCase().includes(s));
}

function getServiceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("pi network"))       return "π";
  if (n.includes("sidra"))            return "S";
  if (n.includes("bitcoin"))          return "₿";
  if (n.includes("ethereum"))         return "Ξ";
  if (n.includes("bnb"))              return "B";
  if (n.includes("solana"))           return "◎";
  if (n.includes("tron"))             return "T";
  if (n.includes("ton"))              return "◈";
  if (n.includes("xrp"))             return "X";
  if (n.includes("stellar"))          return "★";
  if (n.includes("wave"))             return "~";
  if (n.includes("paypal"))           return "P";
  if (n.includes("airtel"))           return "A";
  if (n.includes("mtn"))              return "M";
  if (n.includes("mobile money"))     return "$";
  if (n.includes("card") || n.includes("carte")) return "▣";
  if (n.includes("exchange"))         return "⇄";
  return null;
}

// --- PARTY CARD (expéditeur / destinataire) ---
function PartyCard({ label, name, username, email, phone, isCurrentUser }: {
  label: string; name: string; username?: string | null;
  email?: string | null; phone?: string | null; isCurrentUser?: boolean;
}) {
  const external = isExternalService(name);
  const serviceIcon = external ? getServiceIcon(name) : null;

  return (
    <div className={`rounded-2xl p-3 border space-y-1 ${
      isCurrentUser  ? "bg-blue-600/10 border-blue-500/20"
      : external     ? "bg-slate-900/80 border-cyan-500/15"
                     : "bg-slate-950/60 border-white/5"
    }`}>
      <span className={`text-[8px] font-black uppercase tracking-widest ${
        isCurrentUser ? "text-blue-400" : external ? "text-cyan-600" : "text-slate-600"
      }`}>
        {label}
      </span>
      <div className="flex items-center gap-2 mt-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
          isCurrentUser  ? "bg-blue-600/20 text-blue-400"
          : external     ? "bg-cyan-600/15 text-cyan-300"
                         : "bg-slate-800 text-slate-500"
        }`}>
          {serviceIcon || <User size={12} />}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold truncate leading-tight ${external ? "text-cyan-200" : "text-white"}`}>
            {name}
          </p>
          {username && <p className="text-[9px] text-slate-500 truncate">@{username}</p>}
        </div>
      </div>
      {email && <p className="text-[9px] text-slate-600 truncate">{email}</p>}
      {phone && <p className="text-[9px] text-slate-600 truncate">{phone}</p>}
    </div>
  );
}

// --- DETAIL ROW ---
function DetailRow({ label, value, accent, mono }: {
  label: string; value: string; accent?: string; mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0">{label}</span>
      <span className={`text-[10px] font-bold truncate text-right ${accent || "text-slate-300"} ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
