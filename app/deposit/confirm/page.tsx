"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  Smartphone,
  Lock,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCcw,
} from "lucide-react";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref =
    searchParams.get("ref") ||
    "TRX-" + Math.random().toString(36).substring(7).toUpperCase();
  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method") || "Mobile Money";

  const [dots, setDots] = useState("");
  const [timerCount, setTimerCount] = useState(120);
  const [status, setStatus] = useState<"pending" | "success" | "failed">(
    "pending"
  );
  const [pollCount, setPollCount] = useState(0);

  // Animation des points de suspension
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Compte a rebours visuel
  useEffect(() => {
    if (timerCount <= 0 || status !== "pending") return;
    const timer = setInterval(() => {
      setTimerCount((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timerCount, status]);

  // Polling pour verifier le statut de la transaction
  const checkStatus = useCallback(async () => {
    if (!ref || status !== "pending") return;

    try {
      const response = await fetch(
        `/api/transaction/status?ref=${encodeURIComponent(ref)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (
          data.status === "SUCCESS" ||
          data.status === "COMPLETED"
        ) {
          setStatus("success");
          setTimeout(() => {
            router.push(
              `/deposit/success?ref=${ref}${amountParam ? `&amount=${amountParam}` : ""}&method=${encodeURIComponent(methodParam)}`
            );
          }, 1500);
        } else if (
          data.status === "FAILED" ||
          data.status === "REJECTED"
        ) {
          setStatus("failed");
          setTimeout(() => {
            router.push(`/deposit/failed?ref=${ref}`);
          }, 1500);
        }
      }
    } catch {
      // Silencieux, on continue le polling
    }
    setPollCount((prev) => prev + 1);
  }, [ref, status, router, amountParam, methodParam]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [checkStatus, status]);

  // Timeout: apres le compteur, rediriger
  useEffect(() => {
    if (timerCount <= 0 && status === "pending") {
      setStatus("failed");
      setTimeout(() => {
        router.push(`/deposit/failed?ref=${ref}&reason=timeout`);
      }, 2000);
    }
  }, [timerCount, status, router, ref]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.max(
    0,
    Math.min(100, ((120 - timerCount) / 120) * 100)
  );

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-10 px-6 text-center font-sans">
      {/* Header */}
      <div className="w-full flex justify-between items-center max-w-md">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10"
        >
          <ArrowLeft size={18} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            {status === "pending"
              ? "En attente"
              : status === "success"
                ? "Confirme"
                : "Echoue"}
          </span>
        </div>
        <div className="text-slate-600 text-[9px] font-mono">
          {ref.slice(0, 16)}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-sm">
        {/* Icon avec animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping scale-[1.6] opacity-10" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse scale-125 opacity-20" />

          <div className="relative w-36 h-36 bg-blue-600/5 rounded-full flex items-center justify-center border border-white/5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.4)]">
            {status === "pending" && (
              <div className="relative">
                <Smartphone
                  className="text-white opacity-90"
                  size={56}
                  strokeWidth={1.5}
                />
                <div className="absolute -top-3 -right-5 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-[#020617] rotate-12 animate-bounce">
                  <Lock className="text-white" size={20} />
                </div>
              </div>
            )}
            {status === "success" && (
              <CheckCircle2
                size={56}
                className="text-emerald-500 animate-in zoom-in duration-300"
              />
            )}
            {status === "failed" && (
              <XCircle
                size={56}
                className="text-red-500 animate-in zoom-in duration-300"
              />
            )}
          </div>

          {/* Timer badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#020617] px-4 py-1.5 border border-blue-500/30 rounded-xl shadow-2xl flex items-center gap-2">
            {status === "pending" ? (
              <>
                <Loader2 className="text-blue-500 animate-spin" size={16} />
                <span className="text-blue-500 font-black text-xs">
                  {formatTime(timerCount)}
                </span>
              </>
            ) : status === "success" ? (
              <span className="text-emerald-500 font-black text-xs uppercase">
                Valide
              </span>
            ) : (
              <span className="text-red-500 font-black text-xs uppercase">
                Echoue
              </span>
            )}
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">
          {status === "pending" && "Validation en cours"}
          {status === "success" && "Paiement confirme"}
          {status === "failed" && "Transaction echouee"}
        </h1>

        {/* Instructions */}
        {status === "pending" && (
          <div className="w-full space-y-4">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
              <p className="text-slate-200 text-sm font-bold uppercase tracking-wide">
                Tapez votre code secret
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
                Un message de votre operateur est apparu sur votre ecran. Entrez
                votre{" "}
                <span className="text-white font-black">CODE PIN</span> pour
                confirmer le depot de fonds{dots}
              </p>
            </div>

            {/* Montant */}
            {amountParam && (
              <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                  Montant du depot
                </p>
                <p className="text-2xl font-black text-white">
                  {amountParam}{" "}
                  <span className="text-sm text-blue-400">USD</span>
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  via {methodParam}
                </p>
              </div>
            )}

            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 font-bold uppercase">
                <span>Initie</span>
                <span>Validation</span>
                <span>Credite</span>
              </div>
            </div>

            {/* Etapes */}
            <div className="space-y-2">
              <StepIndicator
                icon={<CheckCircle2 size={14} />}
                label="Demande envoyee a l'operateur"
                status="done"
              />
              <StepIndicator
                icon={<Clock size={14} />}
                label="Attente de validation du code PIN"
                status="active"
              />
              <StepIndicator
                icon={<ShieldCheck size={14} />}
                label="Verification et credit sur PimPay"
                status="pending"
              />
            </div>
          </div>
        )}

        {/* Avertissement */}
        {status === "pending" && (
          <div className="mt-4 flex items-center gap-2 text-amber-500/80 bg-amber-500/5 px-4 py-2.5 rounded-xl border border-amber-500/10">
            <AlertCircle size={14} className="shrink-0" />
            <span className="text-[9px] font-bold uppercase">
              Ne quittez pas cette page pendant la validation
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        {status === "pending" && (
          <div className="flex items-center gap-4 px-5 py-3.5 bg-white/[0.02] rounded-2xl border border-white/5 w-full">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <ShieldCheck size={20} className="text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">
                PimPay Gateway
              </p>
              <p className="text-[8px] font-bold text-slate-500 uppercase">
                Securise par protocole bancaire
              </p>
            </div>
          </div>
        )}

        {status === "failed" && (
          <button
            onClick={() => router.push("/deposit")}
            className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <RefreshCcw size={16} />
            Reessayer
          </button>
        )}

        <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.3em]">
          Tentative {pollCount + 1} de verification
        </p>
      </div>
    </div>
  );
}

function StepIndicator({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: "done" | "active" | "pending";
}) {
  const colors = {
    done: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    active: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    pending: "text-slate-600 bg-white/[0.02] border-white/5",
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${colors[status]}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wide">
        {label}
      </span>
      {status === "active" && (
        <Loader2 size={12} className="ml-auto animate-spin text-blue-400" />
      )}
      {status === "done" && (
        <CheckCircle2
          size={12}
          className="ml-auto text-emerald-500"
        />
      )}
    </div>
  );
}

export default function DepositConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
