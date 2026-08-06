"use client";

import { useMemo, useState } from "react";
import {
  X,
  Phone,
  Mail,
  UserCheck,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { displayFullName } from "@/lib/agent-qr";

export interface AgentCustomer {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  kycStatus?: string | null;
  wallets?: { currency: string; balance: number }[];
}

type Mode = "cash-in" | "cash-out";

interface AgentTransactionModalProps {
  customer: AgentCustomer;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: () => void;
}

const CURRENCIES = ["XAF", "XOF", "PI"];

export function AgentTransactionModal({
  customer,
  initialMode = "cash-in",
  onClose,
  onSuccess,
}: AgentTransactionModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(customer.wallets?.[0]?.currency || "XAF");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const verified = customer.kycStatus === "VERIFIED" || customer.kycStatus === "APPROVED";
  const fullName = displayFullName(customer, "Client");
  const initial = fullName.charAt(0).toUpperCase();

  const walletBalance = useMemo(() => {
    const w = customer.wallets?.find((x) => x.currency === currency);
    return w?.balance ?? 0;
  }, [customer.wallets, currency]);

  async function handleSubmit() {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (mode === "cash-out" && amountNum > walletBalance) {
      toast.error("Solde client insuffisant");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "cash-in" ? "/api/agent/cash-in" : "/api/agent/cash-out";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          amount: amountNum,
          currency,
          // REGLE METIER : seul un retrait (cash-out) est sortant pour le client
          // et exige donc sa confirmation via une notification TRANSACTION_CONFIRM.
          // Un depot (cash-in) est entrant : il est credite immediatement.
          requireConfirmation: mode === "cash-out",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Operation echouee");
      }

      if (data.pendingConfirmation) {
        // Transaction en attente : le client doit confirmer depuis son application.
        setReference(data.transaction?.reference || null);
        setPending(true);
        toast.info("Confirmation client requise", {
          description: `Le client doit valider le retrait de ${amountNum.toLocaleString()} ${currency} depuis son application.`,
        });
      } else {
        setDone(true);
        toast.success(
          mode === "cash-in"
            ? `Depot de ${amountNum.toLocaleString()} ${currency} effectue`
            : `Retrait de ${amountNum.toLocaleString()} ${currency} effectue`,
          {
            description:
              mode === "cash-in"
                ? `${fullName} a ete credite immediatement.`
                : `${fullName} a ete debite.`,
          }
        );
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'operation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#0b1120] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-white">Informations client</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {pending ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock size={40} className="text-amber-400" />
            </div>
            <p className="text-white font-bold">En attente du client</p>
            <p className="text-sm text-slate-400">
              Le client doit confirmer le retrait de{" "}
              <span className="font-bold text-white">
                {parseFloat(amount).toLocaleString()} {currency}
              </span>{" "}
              depuis son application.
            </p>
            {reference && (
              <p className="text-[11px] font-mono text-slate-500">Ref: {reference}</p>
            )}
            <Button onClick={onClose} className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white">
              Terminer
            </Button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <p className="text-white font-bold">Operation reussie</p>
            <p className="text-sm text-slate-400">
              {mode === "cash-in" ? "Depot" : "Retrait"} de {parseFloat(amount).toLocaleString()} {currency}
            </p>
            <Button onClick={onClose} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Terminer
            </Button>
          </div>
        ) : (
          <>
            {/* Customer card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 mb-6">
              <Avatar className="h-14 w-14">
                {customer.avatar ? <AvatarImage src={customer.avatar} alt={customer.name || ""} /> : null}
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-bold text-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{fullName}</p>
                {customer.username && (
                  <p className="text-xs text-slate-500 truncate">@{customer.username}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-400">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1 min-w-0">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </span>
                  )}
                  {verified ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Valide
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      KYC
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Mode toggle: les deux possibilites */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setMode("cash-in")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all",
                  mode === "cash-in"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
              >
                <ArrowDownToLine size={22} />
                <span className="text-xs font-black uppercase tracking-wider">Cash-In</span>
                <span className="text-[10px] font-medium opacity-70">Depot</span>
              </button>
              <button
                onClick={() => setMode("cash-out")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all",
                  mode === "cash-out"
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
              >
                <ArrowUpFromLine size={22} />
                <span className="text-xs font-black uppercase tracking-wider">Cash-Out</span>
                <span className="text-[10px] font-medium opacity-70">Retrait</span>
              </button>
            </div>

            {/* Currency */}
            <div className="flex items-center gap-2 mb-4">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                    currency === c
                      ? "bg-white text-[#020617]"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {c}
                </button>
              ))}
              {mode === "cash-out" && (
                <span className="ml-auto text-[11px] text-slate-500 font-medium">
                  Solde: {walletBalance.toLocaleString()} {currency}
                </span>
              )}
            </div>

            {/* Amount */}
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Montant
            </label>
            <div className="relative mb-6">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-800/50 border-white/10 text-white text-lg font-bold h-14 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                {currency}
              </span>
            </div>

            {/* Confirm */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !amount}
              className={cn(
                "w-full h-13 py-4 text-white font-black uppercase tracking-wider",
                mode === "cash-in"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "cash-in" ? (
                "Confirmer le depot"
              ) : (
                "Confirmer le retrait"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
