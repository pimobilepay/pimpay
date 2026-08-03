"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowDownLeft, Check, Copy, Clock, Loader2, Plus,
  Share2, ShieldCheck, Trash2, HandCoins, Hourglass, ChevronRight,
  Radio, CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { usePaymentRequestWatch, type WatchedRequest } from "@/hooks/usePaymentRequestWatch";
import {
  REQUEST_CURRENCIES,
  REQUEST_DURATIONS,
  buildRequestUrl,
  formatRequestAmount,
  statusMeta,
  timeLeft,
  type PaymentRequestStatus,
} from "@/lib/payment-request";

interface PaymentRequestItem {
  id: string;
  code: string;
  amount: number;
  currency: string;
  note: string | null;
  status: PaymentRequestStatus;
  reference: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  payer?: { username: string; name: string } | null;
}

export default function PaymentRequestPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "fr-FR";

  // Formulaire
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PI");
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState<string>("7d");
  const [creating, setCreating] = useState(false);

  // Demande fraichement creee (ecran de partage)
  const [created, setCreated] = useState<PaymentRequestItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Liste
  const [requests, setRequests] = useState<PaymentRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Tick pour rafraichir les comptes a rebours chaque minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const fetchRequests = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/payments/request", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setRequests(data.requests);
      } else if (res.status === 401) {
        router.push("/auth/login");
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setListLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /* ─── ECOUTE TEMPS REEL DES DEMANDES EN ATTENTE ─────────────────────────
     On surveille uniquement les codes encore PENDING. Des qu'un payeur
     regle une demande, le statut bascule sur "Payee" sans rechargement,
     avec une notification a l'ecran. */
  const pendingCodes = useMemo(
    () => requests.filter((r) => r.status === "PENDING").map((r) => r.code),
    [requests]
  );

  // Demande fraichement reglee, mise en avant en haut de page.
  const [justPaid, setJustPaid] = useState<WatchedRequest | null>(null);

  const handlePaid = useCallback(
    (paid: WatchedRequest) => {
      const payerName = paid.payer?.name || paid.payer?.username;
      setJustPaid(paid);
      toast.success(
        `${t("mpay.request.paidLive")} ${formatRequestAmount(paid.amount, paid.currency)} ${paid.currency}${
          payerName ? ` — ${payerName}` : ""
        }`,
        { duration: 6000 }
      );
      // Resynchronise la liste complete (payeur, reference, horodatage).
      fetchRequests();
    },
    [fetchRequests, t]
  );

  const handleExpiredLive = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  const { live, listening, lastCheck } = usePaymentRequestWatch({
    codes: pendingCodes,
    intervalMs: 4000,
    onPaid: handlePaid,
    onStatusChange: handleExpiredLive,
  });

  // Fusionne l'etat en direct par-dessus la liste chargee.
  const displayRequests = useMemo(
    () =>
      requests.map((r) => {
        const l = live[r.code];
        if (!l || l.status === r.status) return r;
        return {
          ...r,
          status: l.status,
          paidAt: l.paidAt ?? r.paidAt,
          reference: l.reference ?? r.reference,
          payer: l.payer ? { username: l.payer.username, name: l.payer.name || "" } : r.payer,
        };
      }),
    [requests, live]
  );

  // Statut en direct de la demande affichee sur l'ecran de partage.
  const createdLive = created ? live[created.code] : undefined;
  const createdPaid = createdLive?.status === "PAID";

  const shareUrl = created ? buildRequestUrl(created.code) : "";

  const isValidAmount = useMemo(() => {
    const n = Number.parseFloat(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount]);

  const handleCreate = async () => {
    if (!isValidAmount) {
      toast.error(t("transfer.invalidAmount"));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          currency,
          note: note.trim(),
          duration,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || t("common.error"));
        return;
      }
      setCreated(data.request);
      setAmount("");
      setNote("");
      toast.success(t("mpay.request.created"));
      fetchRequests();
    } catch {
      toast.error(t("transfer.serverConnectionError"));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("mpay.request.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleShare = async () => {
    if (!created) return;
    const text = `${formatRequestAmount(created.amount, created.currency)} ${created.currency} — ${shareUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("mpay.request.title"), text, url: shareUrl });
      } catch {
        // partage annule par l'utilisateur
      }
    } else {
      handleCopy();
    }
  };

  const handleCancel = async (code: string) => {
    if (!window.confirm(t("mpay.request.confirmCancel"))) return;
    setCancelling(code);
    try {
      const res = await fetch(`/api/payments/request/${code}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || t("common.error"));
        return;
      }
      toast.success(t("mpay.request.cancelled"));
      fetchRequests();
      if (created?.code === code) setCreated(null);
    } catch {
      toast.error(t("transfer.serverConnectionError"));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={() => (created ? setCreated(null) : router.push("/mpay"))}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">{t("mpay.request.title")}</h1>
          <p className="text-[9px] font-bold text-emerald-500 tracking-[3px] uppercase">
            {t("mpay.request.subtitle")}
          </p>
        </div>
        <div className="w-11" />
      </header>

      <main className="px-6 pt-6 pb-24 space-y-8">
        {created ? (
          /* ─── ECRAN DE PARTAGE ────────────────────────────────── */
          <section className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-teal-600/40 rounded-[2rem] blur-sm opacity-70" />
              <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md flex flex-col items-center gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center ${
                    createdPaid
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/40"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  }`}>
                    {createdPaid ? <CheckCircle2 size={24} /> : <Check size={24} />}
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-tight mt-1">
                    {createdPaid ? t("mpay.request.paidTitle") : t("mpay.request.shareTitle")}
                  </h2>
                  <p className="text-[10px] font-medium text-slate-500 text-center leading-relaxed text-pretty max-w-[16rem]">
                    {createdPaid
                      ? `${t("mpay.request.paidBy")} ${createdLive?.payer?.name || createdLive?.payer?.username || "—"}`
                      : t("mpay.request.shareDesc")}
                  </p>
                </div>

                {/* Montant */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tighter">
                    {formatRequestAmount(created.amount, created.currency)}
                  </span>
                  <span className="text-lg font-black text-emerald-500">{created.currency}</span>
                </div>

                {/* QR ou confirmation de paiement recu en direct */}
                {createdPaid ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                    <CheckCircle2 size={44} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      {t("mpay.request.statusPaid")}
                    </span>
                    {createdLive?.paidAt && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(createdLive.paidAt).toLocaleString(dateLocale)}
                      </span>
                    )}
                    {createdLive?.reference && (
                      <span className="text-[9px] font-mono font-bold text-emerald-400/80 break-all text-center">
                        {createdLive.reference}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-emerald-500/20">
                    <QRCodeSVG value={shareUrl} size={176} level="H" includeMargin={false} />
                  </div>
                )}

                {created.note && (
                  <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed text-pretty">
                    {created.note}
                  </p>
                )}

                {!createdPaid && (
                  <div className="flex items-center gap-2 text-amber-300">
                    <Hourglass size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {timeLeft(created.expiresAt, t)
                        ? `${t("mpay.request.expiresIn")} ${timeLeft(created.expiresAt, t)}`
                        : t("mpay.request.expired")}
                    </span>
                  </div>
                )}

                {/* Indicateur d'ecoute : le statut basculera tout seul */}
                {!createdPaid && listening && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                      {t("mpay.request.waitingPayment")}
                    </span>
                  </div>
                )}

                {/* Lien */}
                {!createdPaid && (
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-[10px] font-mono font-bold text-emerald-400 break-all leading-relaxed">
                      {shareUrl}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {createdPaid ? (
                  <button
                    onClick={() => router.push(`/mpay/request/${created.code}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-600/25"
                  >
                    <ChevronRight size={14} />
                    {t("mpay.request.viewDetails")}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? t("common.copied") : t("mpay.request.copyLink")}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-600/25"
                    >
                      <Share2 size={14} />
                      {t("mpay.request.share")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setCreated(null)}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              {t("mpay.request.newAnother")}
            </button>
          </section>
        ) : (
          /* ─── FORMULAIRE ──────────────────────────────────────── */
          <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/25 to-teal-600/25 rounded-[2rem] blur-sm opacity-60" />
              <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/25">
                    <HandCoins size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight">
                      {t("mpay.request.newRequest")}
                    </h2>
                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed text-pretty mt-0.5">
                      {t("mpay.request.newRequestDesc")}
                    </p>
                  </div>
                </div>

                {/* Montant */}
                <div className="space-y-2">
                  <label
                    htmlFor="request-amount"
                    className="block text-[9px] font-black text-slate-500 uppercase tracking-widest"
                  >
                    {t("mpay.request.amount")}
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-emerald-500/50 transition-all">
                    <input
                      id="request-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
                      }}
                      placeholder={t("mpay.request.amountPlaceholder")}
                      className="bg-transparent flex-1 outline-none text-3xl font-black tracking-tighter placeholder:text-slate-700 min-w-0"
                    />
                    <span className="text-lg font-black text-emerald-500 flex-shrink-0">
                      {currency}
                    </span>
                  </div>
                </div>

                {/* Devise */}
                <div className="space-y-2">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {t("mpay.request.currency")}
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                    {REQUEST_CURRENCIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        aria-pressed={currency === c}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          currency === c
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                            : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label
                    htmlFor="request-note"
                    className="block text-[9px] font-black text-slate-500 uppercase tracking-widest"
                  >
                    {t("mpay.request.note")}
                  </label>
                  <input
                    id="request-note"
                    type="text"
                    value={note}
                    maxLength={200}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("mpay.request.notePlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Duree d'expiration */}
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <Clock size={11} />
                    {t("mpay.request.duration")}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {REQUEST_DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDuration(d.value)}
                        aria-pressed={duration === d.value}
                        className={`py-3 rounded-2xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                          duration === d.value
                            ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/25"
                            : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                        }`}
                      >
                        {t(d.labelKey)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-medium text-slate-600 leading-relaxed text-pretty">
                    {t("mpay.request.durationHint")}
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating || !isValidAmount}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-xs shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
                >
                  {creating ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownLeft size={18} />}
                  {creating ? t("mpay.request.creating") : t("mpay.request.create")}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-600">
              <ShieldCheck size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {t("transfer.secureProtocol")}
              </span>
            </div>
          </section>
        )}

        {/* ─── NOTIFICATION EN DIRECT : DEMANDE REGLEE ───────────── */}
        {justPaid && (
          <div
            role="status"
            aria-live="polite"
            className="relative bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <div className="w-11 h-11 flex-shrink-0 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <CheckCircle2 size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-tight text-emerald-300">
                {t("mpay.request.paidTitle")}
              </p>
              <p className="text-[11px] font-bold text-white mt-1">
                {formatRequestAmount(justPaid.amount, justPaid.currency)} {justPaid.currency}
                {(justPaid.payer?.name || justPaid.payer?.username) &&
                  ` — ${justPaid.payer?.name || justPaid.payer?.username}`}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                {justPaid.paidAt
                  ? new Date(justPaid.paidAt).toLocaleString(dateLocale)
                  : new Date().toLocaleString(dateLocale)}
              </p>
              {justPaid.reference && (
                <p className="text-[9px] font-mono font-bold text-emerald-400/80 break-all mt-1">
                  {justPaid.reference}
                </p>
              )}
            </div>
            <button
              onClick={() => setJustPaid(null)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex-shrink-0"
              aria-label={t("common.close")}
            >
              <Check size={12} />
            </button>
          </div>
        )}

        {/* ─── MES DEMANDES ──────────────────────────────────────── */}
        <section aria-labelledby="my-requests-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-emerald-500" />
              <h2
                id="my-requests-heading"
                className="text-xs font-black uppercase tracking-widest text-slate-300"
              >
                {t("mpay.request.myRequests")}
              </h2>
              {listening && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg"
                  title={
                    lastCheck
                      ? `${t("mpay.request.lastCheck")} ${lastCheck.toLocaleTimeString(dateLocale)}`
                      : undefined
                  }
                >
                  <Radio size={9} className="text-emerald-400 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">
                    {t("mpay.request.live")}
                  </span>
                </span>
              )}
            </div>
            {requests.length > 0 && (
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                {requests.length}
              </span>
            )}
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-emerald-500" size={22} />
              <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase">
                {t("common.loading")}
              </span>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] py-10 px-6 text-center">
              <HandCoins size={32} className="mx-auto text-slate-700 mb-3" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {t("mpay.request.noRequests")}
              </p>
              <p className="text-[10px] font-medium text-slate-600 mt-1 leading-relaxed">
                {t("mpay.request.noRequestsDesc")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {displayRequests.map((r) => {
                const meta = statusMeta(r.status);
                const remaining = timeLeft(r.expiresAt, t);
                const payerName = r.payer?.name || r.payer?.username;
                const isLivePaid = justPaid?.code === r.code;
                return (
                  <li
                    key={r.id}
                    className={`border rounded-2xl p-4 transition-all ${
                      isLivePaid
                        ? "bg-emerald-500/[0.07] border-emerald-500/40 animate-in fade-in zoom-in-95 duration-500"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => router.push(`/mpay/request/${r.code}`)}
                        className="flex-1 min-w-0 text-left group"
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black tracking-tighter">
                            {formatRequestAmount(r.amount, r.currency)}
                          </span>
                          <span className="text-[10px] font-black text-emerald-500">
                            {r.currency}
                          </span>
                          <ChevronRight
                            size={14}
                            className="text-slate-600 group-hover:text-slate-400 transition-colors ml-0.5"
                          />
                        </div>
                        {r.note && (
                          <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                            {r.note}
                          </p>
                        )}
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1.5">
                          {r.status === "PAID" && r.paidAt
                            ? `${t("mpay.request.paidOn")} ${new Date(r.paidAt).toLocaleDateString(dateLocale)}${payerName ? ` — ${payerName}` : ""}`
                            : r.status === "PENDING" && remaining
                              ? `${t("mpay.request.expiresIn")} ${remaining}`
                              : `${t("mpay.request.expiresOn")} ${new Date(r.expiresAt).toLocaleDateString(dateLocale)}`}
                        </p>
                      </button>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider ${meta.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {t(meta.labelKey)}
                        </span>
                        {r.status === "PENDING" && (
                          <button
                            onClick={() => handleCancel(r.code)}
                            disabled={cancelling === r.code}
                            className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-40"
                            aria-label={t("mpay.request.cancel")}
                          >
                            {cancelling === r.code ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
