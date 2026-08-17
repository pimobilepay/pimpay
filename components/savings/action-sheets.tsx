"use client";

/**
 * Feuilles de mouvement de fonds.
 *
 * Deux familles, calquées sur la politique du backend :
 *   - DepositSheet  : mouvement entrant (portefeuille -> produit), sans PIN.
 *   - ExitSheet     : mouvement sortant (produit -> portefeuille), PIN exigé.
 *
 * `ExitSheet` interroge d'abord la route de simulation (GET) pour afficher la
 * pénalité exacte avant confirmation, plutôt que de laisser l'utilisateur
 * découvrir la retenue après l'opération.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import {
  money,
  formatDate,
  newIdempotencyKey,
  readError,
  localeTag,
  type ExitQuote,
} from "./savings-shared";
import {
  Sheet,
  Field,
  AmountInput,
  PinInput,
  SubmitButton,
  SummaryRow,
} from "./savings-ui";
import { useLanguage } from "@/context/LanguageContext";

/* ------------------------------------------------------------------ */
/*  Mouvement entrant                                                  */
/* ------------------------------------------------------------------ */

export function DepositSheet({
  open,
  onClose,
  onDone,
  endpoint,
  title,
  subtitle,
  currency,
  walletBalance,
  actionLabel,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  endpoint: string;
  title: string;
  subtitle: string;
  currency: string;
  walletBalance: number;
  actionLabel: string;
}) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setAmount("");
  }, [open]);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const exceedsWallet = valid && value > walletBalance;

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, idempotencyKey: newIdempotencyKey() }),
      });
      if (!res.ok) throw new Error(await readError(res, t("savings.operationRefused")));
      toast.success(t("savings.transferredToast").replace("{amount}", money(value, currency)));
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <Field
        label={t("savings.amount")}
        hint={t("savings.depositHint")
          .replace("{currency}", currency)
          .replace("{balance}", money(walletBalance, currency))}
      >
        <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus />
      </Field>

      {/* Raccourcis de saisie basés sur le solde réellement disponible. */}
      {walletBalance > 0 && (
        <div className="mb-4 flex gap-2">
          {[0.25, 0.5, 1].map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAmount(String(Math.floor(walletBalance * ratio * 100) / 100))}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/40 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {ratio === 1 ? t("savings.quickAll") : `${ratio * 100}%`}
            </button>
          ))}
        </div>
      )}

      {exceedsWallet && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-rose-300">
          <AlertTriangle size={12} className="mt-px shrink-0" />
          {t("savings.exceedsWallet").replace("{currency}", currency)}
        </p>
      )}

      <SubmitButton onClick={submit} loading={busy} disabled={!valid || exceedsWallet}>
        {actionLabel}
      </SubmitButton>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Mouvement sortant                                                  */
/* ------------------------------------------------------------------ */

/**
 * @param mode "partial" laisse saisir un montant (retrait épargne, déblocage
 *             partiel de coffre). "full" solde le produit intégralement
 *             (clôture) et n'affiche donc pas de champ montant.
 * @param quoteEndpoint route GET de simulation. Absente pour un retrait simple,
 *             qui n'entraîne jamais de pénalité.
 */
export function ExitSheet({
  open,
  onClose,
  onDone,
  endpoint,
  quoteEndpoint,
  title,
  subtitle,
  currency,
  maxAmount,
  mode,
  actionLabel,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  endpoint: string;
  quoteEndpoint?: string;
  title: string;
  subtitle: string;
  currency: string;
  maxAmount: number;
  mode: "partial" | "full";
  actionLabel: string;
  danger?: boolean;
}) {
  const { t, locale } = useLanguage();
  const bcp = localeTag(locale);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<ExitQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setPin("");
    setQuote(null);
    if (!quoteEndpoint) return;

    // Simulation chargée à l'ouverture : elle conditionne l'avertissement.
    let cancelled = false;
    setLoadingQuote(true);
    fetch(quoteEndpoint, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, t("savings.simUnavailable")));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, quoteEndpoint]);

  const value = mode === "full" ? maxAmount : Number(amount);
  const amountValid = mode === "full" ? maxAmount >= 0 : Number.isFinite(value) && value > 0;
  const exceeds = mode === "partial" && amountValid && value > maxAmount;
  const pinValid = pin.length === 4 || pin.length === 6;

  // Pénalité : issue de la simulation en mode complet, recalculée au prorata
  // du montant saisi en mode partiel.
  const penaltyRate = quote?.penaltyRate ?? 0;
  const penalty =
    mode === "full"
      ? (quote?.penalty ?? 0)
      : penaltyRate > 0 && amountValid
        ? Math.round(((value * penaltyRate) / 100) * 100) / 100
        : 0;
  const net = Math.round((value - penalty) * 100) / 100;

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          // En mode complet on laisse le serveur solder le produit : il connaît
          // le solde exact au moment de la transaction.
          ...(mode === "partial" ? { amount: value } : {}),
          idempotencyKey: newIdempotencyKey(),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, t("savings.operationRefused")));
      const data = await res.json();
      toast.success(
        data.penalty > 0
          ? t("savings.creditedPenaltyToast")
              .replace("{net}", money(data.netAmount, currency))
              .replace("{penalty}", money(data.penalty, currency))
          : t("savings.creditedToast").replace("{amount}", money(data.netAmount ?? value, currency))
      );
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const hasPenalty = penalty > 0;

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {loadingQuote ? (
        <div className="flex justify-center py-10 text-blue-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <>
          {mode === "partial" ? (
            <>
              <Field label={t("savings.amount")} hint={t("savings.availableHint").replace("{amount}", money(maxAmount, currency))}>
                <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus />
              </Field>
              {maxAmount > 0 && (
                <div className="mb-4 flex gap-2">
                  {[0.5, 1].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAmount(String(Math.floor(maxAmount * ratio * 100) / 100))}
                      className="flex-1 rounded-xl border border-white/10 bg-slate-900/40 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {ratio === 1 ? t("savings.withdrawAll") : t("savings.half")}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {t("savings.balanceToRepatriate")}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-white">
                {money(maxAmount, currency)}
              </p>
            </div>
          )}

          {exceeds && (
            <p className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-rose-300">
              <AlertTriangle size={12} className="mt-px shrink-0" />
              {t("savings.exceedsBalance")}
            </p>
          )}

          {/* Avertissement de sortie anticipée, chiffré. */}
          {hasPenalty && (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400">
                <AlertTriangle size={12} /> {t("savings.earlyExit")}
              </p>
              <p className="text-[10px] leading-relaxed text-rose-300">
                {quote?.maturityDate
                  ? t("savings.maturityPlanned").replace("{date}", formatDate(quote.maturityDate, bcp))
                  : quote?.lockUntil
                    ? t("savings.lockActiveUntil").replace("{date}", formatDate(quote.lockUntil, bcp))
                    : null}{" "}
                {t("savings.penaltyWillApply").replace("{rate}", String(penaltyRate))}
              </p>
              <div className="mt-2 border-t border-rose-500/15 pt-1">
                <SummaryRow label={t("savings.amount")} value={money(value, currency)} />
                <SummaryRow label={t("savings.penaltyLabel")} value={`- ${money(penalty, currency)}`} emphasis="danger" />
                <SummaryRow label={t("savings.netCredited")} value={money(net, currency)} emphasis="success" />
              </div>
            </div>
          )}

          {!hasPenalty && amountValid && value > 0 && (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
              <SummaryRow label={t("savings.netCredited")} value={money(net, currency)} emphasis="success" />
            </div>
          )}

          <Field label={t("savings.pinLabel")} hint={t("savings.pinHint")}>
            <PinInput value={pin} onChange={setPin} />
          </Field>

          <p className="mb-4 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <ShieldCheck size={12} className="mt-px shrink-0 text-slate-600" />
            {t("savings.fundsCreditedTo").replace("{currency}", currency)}
          </p>

          <SubmitButton
            onClick={submit}
            loading={busy}
            disabled={!amountValid || exceeds || !pinValid}
            variant={danger || hasPenalty ? "danger" : "primary"}
          >
            {actionLabel}
          </SubmitButton>
        </>
      )}
    </Sheet>
  );
}
