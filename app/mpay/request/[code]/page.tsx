"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowUpRight, Check, Copy, Hourglass, Loader2,
  ShieldCheck, Share2, TriangleAlert, User, Zap,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  buildRequestUrl,
  formatRequestAmount,
  statusMeta,
  timeLeft,
  type PaymentRequestStatus,
} from "@/lib/payment-request";

interface RequestDetails {
  code: string;
  amount: number;
  currency: string;
  note: string | null;
  status: PaymentRequestStatus;
  expiresAt: string;
  paidAt: string | null;
  reference: string | null;
  requester: { id: string; username: string; name: string };
  payer: { username: string; name: string } | null;
  isOwner: boolean;
}

export default function PayRequestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { t, locale } = useLanguage();
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "fr-FR";

  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rafraichit le compte a rebours chaque minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/request/${code}`, { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/auth/login?redirect=/mpay/request/${code}`);
        return;
      }
      if (!res.ok || !data.request) {
        setNotFound(true);
        return;
      }
      setRequest(data.request);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [code, router]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const shareUrl = buildRequestUrl(code);

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
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("mpay.request.title"), url: shareUrl });
      } catch {
        // partage annule
      }
    } else {
      handleCopy();
    }
  };

  const handlePay = async () => {
    if (!request) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/payments/request/${code}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || t("common.error"));
        // Resynchronise l'etat (expiree / deja payee / annulee)
        fetchRequest();
        return;
      }

      toast.success(t("mpay.request.paySuccess"));
      router.push(
        `/mpay/success?amount=${data.amount}&to=@${data.requesterUsername}&txid=${data.reference}`
      );
    } catch {
      toast.error(t("transfer.serverConnectionError"));
    } finally {
      setPaying(false);
    }
  };

  /* ─── Chargement ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  /* ─── Introuvable ────────────────────────────────────────── */
  if (notFound || !request) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
          <TriangleAlert size={26} />
        </div>
        <h1 className="text-base font-black uppercase tracking-tight">
          {t("mpay.request.notFound")}
        </h1>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed text-pretty max-w-xs">
          {t("mpay.request.notFoundDesc")}
        </p>
        <button
          onClick={() => router.push("/mpay")}
          className="mt-2 px-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
        >
          {t("mpay.request.backToMpay")}
        </button>
      </div>
    );
  }

  const meta = statusMeta(request.status);
  const remaining = timeLeft(request.expiresAt, t);
  const requesterName = request.requester.name || request.requester.username;
  const isPending = request.status === "PENDING" && !!remaining;
  const canPay = isPending && !request.isOwner;

  const blockedMessage =
    request.status === "PAID"
      ? t("mpay.request.alreadyPaid")
      : request.status === "CANCELLED"
        ? t("mpay.request.wasCancelled")
        : request.status === "EXPIRED" || !remaining
          ? t("mpay.request.hasExpired")
          : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={() => router.push("/mpay")}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">
            {request.isOwner ? t("mpay.request.title") : t("mpay.request.payTitle")}
          </h1>
          <p className="text-[9px] font-bold text-emerald-500 tracking-[3px] uppercase font-mono">
            {request.code}
          </p>
        </div>
        <div className="w-11" />
      </header>

      <main className="px-6 pt-6 pb-24 space-y-6">
        {/* CARTE PRINCIPALE */}
        <section className="relative animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-7 backdrop-blur-md flex flex-col items-center gap-5">
            {/* Statut */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${meta.className}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {t(meta.labelKey)}
            </span>

            {/* Demandeur */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/25">
                <User size={26} className="text-white" />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {t("mpay.request.requestedBy")}
              </p>
              <p className="text-base font-black tracking-tight text-balance text-center">
                {requesterName}
              </p>
              <p className="text-[10px] font-bold text-slate-500">@{request.requester.username}</p>
            </div>

            {/* Montant */}
            <div className="w-full pt-5 border-t border-white/5 flex flex-col items-center gap-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {t("mpay.request.amountToPay")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter">
                  {formatRequestAmount(request.amount, request.currency)}
                </span>
                <span className="text-xl font-black text-emerald-500">{request.currency}</span>
              </div>
            </div>

            {/* Note */}
            {request.note && (
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-[11px] font-medium text-slate-300 leading-relaxed text-pretty text-center">
                  {request.note}
                </p>
              </div>
            )}

            {/* Expiration / paiement */}
            {isPending ? (
              <div className="flex items-center gap-2 text-amber-300">
                <Hourglass size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {t("mpay.request.expiresIn")} {remaining}
                </span>
              </div>
            ) : request.status === "PAID" && request.paidAt ? (
              <div className="flex flex-col items-center gap-1 text-emerald-300">
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {t("mpay.request.paidOn")}{" "}
                  {new Date(request.paidAt).toLocaleString(dateLocale)}
                </span>
                {request.payer && (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("mpay.request.paidBy")} {request.payer.name || request.payer.username}
                  </span>
                )}
              </div>
            ) : null}

            {request.reference && (
              <p className="text-[9px] font-mono font-bold text-slate-600 break-all text-center">
                {request.reference}
              </p>
            )}
          </div>
        </section>

        {/* ACTION */}
        {canPay ? (
          <section className="space-y-4">
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-emerald-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {paying ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
              {paying ? t("mpay.request.paying") : t("mpay.request.payNow")}
            </button>
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <ShieldCheck size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {t("transfer.secureProtocol")}
              </span>
            </div>
          </section>
        ) : request.isOwner && isPending ? (
          /* Le demandeur consulte sa propre demande : on lui propose de la repartager */
          <section className="space-y-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-5">
              <div className="flex items-center gap-2 text-slate-400">
                <ArrowUpRight size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {t("mpay.request.yourRequest")}
                </span>
              </div>
              <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-emerald-500/20">
                <QRCodeSVG value={shareUrl} size={164} level="H" includeMargin={false} />
              </div>
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3">
                <p className="text-[10px] font-mono font-bold text-emerald-400 break-all leading-relaxed">
                  {shareUrl}
                </p>
              </div>
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
            </div>
          </section>
        ) : (
          /* Demande non payable : payee, annulee ou expiree */
          <section className="space-y-4">
            {blockedMessage && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-start gap-3">
                <TriangleAlert size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-slate-300 leading-relaxed text-pretty">
                  {blockedMessage}
                </p>
              </div>
            )}
            <button
              onClick={() => router.push("/mpay")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
            >
              {t("mpay.request.backToMpay")}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
