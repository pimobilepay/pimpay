"use client";

/**
 * Cartes de présentation d'un compte épargne et d'un coffre-fort.
 * Purement présentationnelles : toute action est remontée au parent.
 */

import {
  PiggyBank,
  Lock,
  Unlock,
  Plus,
  ArrowUpRight,
  XCircle,
  TrendingUp,
  CalendarClock,
  AlertTriangle,
  Repeat,
} from "lucide-react";
import {
  money,
  formatDate,
  localeTag,
  SAVINGS_TYPE_META,
  type SavingsAccountView,
  type VaultView,
} from "./savings-shared";
import { StatusBadge, Progress } from "./savings-ui";
import { useLanguage } from "@/context/LanguageContext";

/* ------------------------------------------------------------------ */
/*  Compte épargne                                                     */
/* ------------------------------------------------------------------ */

export function SavingsCard({
  account,
  onDeposit,
  onWithdraw,
  onClose,
}: {
  account: SavingsAccountView;
  onDeposit: () => void;
  onWithdraw: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const bcp = localeTag(locale);
  const meta = SAVINGS_TYPE_META[account.type];
  const frozen = account.status === "FROZEN";

  // Un dépôt à terme non échu ne peut pas être débité partiellement : le
  // backend refuse le retrait, on masque donc le bouton plutôt que de laisser
  // l'utilisateur se heurter à une erreur.
  const maturity = account.maturityDate ? new Date(account.maturityDate) : null;
  const stillLocked = account.type === "FIXED_DEPOSIT" && !!maturity && new Date() < maturity;

  return (
    <article className="rounded-3xl border border-white/5 bg-slate-900/40 p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-2xl bg-blue-500/10 p-2.5">
            <PiggyBank size={18} className={meta.accent} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{account.name}</h3>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {t(meta.labelKey)}
            </p>
            <p className="mt-1 font-mono text-[9px] text-slate-600">{account.accountNumber}</p>
          </div>
        </div>
        <StatusBadge status={account.status} />
      </header>

      <div className="mb-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{t("savings.balance")}</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-white">
          {money(account.balance, account.currency)}
        </p>
      </div>

      {/* Objectif chiffré : barre de progression */}
      {account.targetAmount !== null && account.progress !== null && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {t("savings.goal")} {money(account.targetAmount, account.currency)}
            </span>
            <span className="text-[10px] font-black tabular-nums text-cyan-400">
              {account.progress}%
            </span>
          </div>
          <Progress value={account.progress} accent="bg-cyan-500" />
        </div>
      )}

      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.02] px-3 py-2.5">
          <dt className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">
            <TrendingUp size={10} /> {t("savings.annualRate")}
          </dt>
          <dd className="mt-1 text-xs font-black tabular-nums text-emerald-400">
            {account.interestRate}%
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.02] px-3 py-2.5">
          <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {t("savings.accruedInterest")}
          </dt>
          <dd className="mt-1 text-xs font-black tabular-nums text-emerald-400">
            {money(account.totalInterest, account.currency)}
          </dd>
        </div>
      </dl>

      {maturity && (
        <p className="mb-4 flex items-center gap-1.5 text-[10px] text-slate-500">
          <CalendarClock size={11} />
          {stillLocked ? t("savings.lockedUntil") : t("savings.maturityReached")} {formatDate(account.maturityDate, bcp)}
        </p>
      )}

      {account.autoDebitAmount && account.autoDebitDay && (
        <p className="mb-4 flex items-center gap-1.5 text-[10px] text-slate-500">
          <Repeat size={11} />
          {money(account.autoDebitAmount, account.currency)} {t("savings.monthlyOn")} {account.autoDebitDay} {t("savings.monthlyEach")}
        </p>
      )}

      {frozen ? (
        <p className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-rose-300">
          <AlertTriangle size={12} className="mt-px shrink-0" />
          {t("savings.frozenNotice")}
        </p>
      ) : (
        <div className="flex gap-2">
          <CardAction icon={<Plus size={13} />} label={t("savings.deposit")} onClick={onDeposit} tone="primary" />
          {!stillLocked && (
            <CardAction icon={<ArrowUpRight size={13} />} label={t("savings.withdraw")} onClick={onWithdraw} />
          )}
          <CardAction icon={<XCircle size={13} />} label={t("savings.close")} onClick={onClose} tone="danger" />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Coffre-fort                                                        */
/* ------------------------------------------------------------------ */

export function VaultCard({
  vault,
  onLock,
  onUnlock,
}: {
  vault: VaultView;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const { t, locale } = useLanguage();
  const bcp = localeTag(locale);
  return (
    <article className="rounded-3xl border border-white/5 bg-slate-900/40 p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`shrink-0 rounded-2xl p-2.5 ${vault.isLocked ? "bg-amber-500/10" : "bg-emerald-500/10"}`}
          >
            {vault.isLocked ? (
              <Lock size={18} className="text-amber-400" />
            ) : (
              <Unlock size={18} className="text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{vault.name}</h3>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {t("savings.vault")}
            </p>
          </div>
        </div>
        <StatusBadge status={vault.status} />
      </header>

      <div className="mb-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {t("savings.immobilizedAmount")}
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums text-white">
          {money(vault.amount, vault.currency)}
        </p>
      </div>

      {vault.targetAmount !== null && vault.progress !== null && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {t("savings.goal")} {money(vault.targetAmount, vault.currency)}
            </span>
            <span className="text-[10px] font-black tabular-nums text-amber-400">
              {vault.progress}%
            </span>
          </div>
          <Progress value={vault.progress} accent="bg-amber-500" />
        </div>
      )}

      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.02] px-3 py-2.5">
          <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {t("savings.annualRate")}
          </dt>
          <dd className="mt-1 text-xs font-black tabular-nums text-emerald-400">
            {vault.interestRate}%
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.02] px-3 py-2.5">
          <dt className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {t("savings.accruedInterest")}
          </dt>
          <dd className="mt-1 text-xs font-black tabular-nums text-emerald-400">
            {money(vault.totalInterest, vault.currency)}
          </dd>
        </div>
      </dl>

      {/* Le coût d'un déblocage anticipé est affiché avant l'action, pas après. */}
      {vault.isLocked ? (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
            <Lock size={11} />
            {t("savings.lockedRemaining")
              .replace("{days}", String(vault.daysRemaining))
              .replace("{unit}", vault.daysRemaining > 1 ? t("savings.daysUnit") : t("savings.dayUnit"))
              .replace("{date}", formatDate(vault.lockUntil, bcp))}
          </p>
          {vault.amount > 0 && (
            <p className="mt-1 text-[10px] text-amber-400/70">
              {t("savings.immediateUnlock")
                .replace("{rate}", String(vault.penaltyRate))
                .replace("{amount}", money(vault.earlyPenaltyNow, vault.currency))}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-4 flex items-center gap-1.5 text-[10px] text-emerald-400">
          <Unlock size={11} /> {t("savings.fundsAvailable")}
        </p>
      )}

      <div className="flex gap-2">
        <CardAction icon={<Plus size={13} />} label={t("savings.feed")} onClick={onLock} tone="primary" />
        {vault.amount > 0 && (
          <CardAction
            icon={<Unlock size={13} />}
            label={t("savings.unlock")}
            onClick={onUnlock}
            tone={vault.isLocked ? "danger" : "default"}
          />
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

function CardAction({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "primary" | "danger" | "default";
}) {
  const palette =
    tone === "primary"
      ? "bg-blue-600/15 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white"
      : tone === "danger"
        ? "bg-rose-600/10 text-rose-400 border-rose-500/20 hover:bg-rose-600 hover:text-white"
        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white";

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${palette}`}
    >
      {icon}
      {label}
    </button>
  );
}
