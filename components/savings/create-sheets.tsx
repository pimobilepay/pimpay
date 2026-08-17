"use client";

/**
 * Feuilles d'ouverture d'un produit : compte épargne et coffre-fort.
 *
 * Les deux produits sont créés avec un solde nul ; l'alimentation est une
 * seconde étape explicite. Cela évite un formulaire qui échouerait à moitié
 * (compte créé mais dépôt refusé pour solde insuffisant).
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  CURRENCIES,
  TERM_MONTHS,
  SAVINGS_TYPE_META,
  money,
  readError,
  localeTag,
  type SavingsTypeKey,
  type WalletView,
} from "./savings-shared";
import { Sheet, Field, TextInput, AmountInput, Select, SubmitButton } from "./savings-ui";
import { useLanguage } from "@/context/LanguageContext";

const TYPE_ORDER: SavingsTypeKey[] = ["REGULAR", "GOAL_BASED", "FIXED_DEPOSIT", "RECURRING"];

/** Bornes du verrou d'un coffre, miroir de MIN/MAX_LOCK_DAYS côté API. */
const LOCK_PRESETS = [
  { days: 30, labelKey: "savings.lock1m" },
  { days: 90, labelKey: "savings.lock3m" },
  { days: 180, labelKey: "savings.lock6m" },
  { days: 365, labelKey: "savings.lock1y" },
  { days: 730, labelKey: "savings.lock2y" },
];

/* ------------------------------------------------------------------ */
/*  Ouverture d'un compte épargne                                      */
/* ------------------------------------------------------------------ */

export function CreateSavingsSheet({
  open,
  onClose,
  onCreated,
  wallets,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  wallets: WalletView[];
}) {
  const { t } = useLanguage();
  const [type, setType] = useState<SavingsTypeKey>("REGULAR");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [target, setTarget] = useState("");
  const [termMonths, setTermMonths] = useState<number>(12);
  const [autoAmount, setAutoAmount] = useState("");
  const [autoDay, setAutoDay] = useState("1");
  const [saving, setSaving] = useState(false);

  const wallet = wallets.find((w) => w.currency === currency);

  function reset() {
    setType("REGULAR");
    setName("");
    setCurrency("XAF");
    setTarget("");
    setTermMonths(12);
    setAutoAmount("");
    setAutoDay("1");
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim() || undefined,
          currency,
          // L'objectif n'a de sens que pour une épargne projet.
          targetAmount: type === "GOAL_BASED" && target ? Number(target) : undefined,
          termMonths: type === "FIXED_DEPOSIT" ? termMonths : undefined,
          autoDebitAmount: type === "RECURRING" && autoAmount ? Number(autoAmount) : undefined,
          autoDebitDay: type === "RECURRING" && autoAmount ? Number(autoDay) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await readError(res, t("savings.openErrorFallback")));
      toast.success(t("savings.savingsOpenedToast"));
      reset();
      onClose();
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("savings.createSavingsTitle")} subtitle={t("savings.createSavingsSubtitle")}>
      <Field label={t("savings.productType")}>
        <div className="grid gap-2">
          {TYPE_ORDER.map((key) => {
            const meta = SAVINGS_TYPE_META[key];
            const active = type === key;
            return (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-blue-500/40 bg-blue-600/10"
                    : "border-white/10 bg-slate-900/40 hover:bg-white/5"
                }`}
              >
                <p className={`text-[11px] font-black uppercase tracking-wider ${active ? meta.accent : "text-slate-300"}`}>
                  {t(meta.labelKey)}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{t(meta.descKey)}</p>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={t("savings.accountName")} hint={t("savings.accountNameHint")}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t("savings.accountNamePlaceholder")}
        />
      </Field>

      <Field
        label={t("savings.currency")}
        hint={
          wallet
            ? t("savings.currencyHintAvailable")
                .replace("{currency}", currency)
                .replace("{balance}", money(wallet.balance, currency))
            : t("savings.currencyHintMissing").replace("{currency}", currency)
        }
      >
        <Select
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>

      {type === "GOAL_BASED" && (
        <Field label={t("savings.goalAmount")} hint={t("savings.goalAmountHint")}>
          <AmountInput value={target} onChange={setTarget} currency={currency} />
        </Field>
      )}

      {type === "FIXED_DEPOSIT" && (
        <Field
          label={t("savings.lockDurationLabel")}
          hint={t("savings.lockDurationHint")}
        >
          <div className="flex flex-wrap gap-2">
            {TERM_MONTHS.map((m) => (
              <button
                key={m}
                onClick={() => setTermMonths(m)}
                className={`rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  termMonths === m
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border-white/10 bg-slate-900/40 text-slate-400 hover:bg-white/5"
                }`}
              >
                {m} {t("savings.monthsSuffix")}
              </button>
            ))}
          </div>
        </Field>
      )}

      {type === "RECURRING" && (
        <>
          <Field label={t("savings.monthlyDeposit")} hint={t("savings.optional")}>
            <AmountInput value={autoAmount} onChange={setAutoAmount} currency={currency} />
          </Field>
          {autoAmount && (
            <Field label={t("savings.debitDay")} hint={t("savings.debitDayHint")}>
              <Select
                value={autoDay}
                onChange={setAutoDay}
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: t("savings.debitDayOption").replace("{n}", String(i + 1)),
                }))}
              />
            </Field>
          )}
        </>
      )}

      <p className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-slate-500">
        {t("savings.zeroBalanceNotice").replace("{currency}", currency)}
      </p>

      <SubmitButton onClick={submit} loading={saving}>
        {t("savings.openAccountBtn")}
      </SubmitButton>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Création d'un coffre-fort                                           */
/* ------------------------------------------------------------------ */

export function CreateVaultSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, locale } = useLanguage();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [target, setTarget] = useState("");
  const [lockDays, setLockDays] = useState(90);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          currency,
          targetAmount: target ? Number(target) : undefined,
          lockDays,
        }),
      });
      if (!res.ok) throw new Error(await readError(res, t("savings.createErrorFallback")));
      toast.success(t("savings.vaultCreatedToast"));
      setName("");
      setTarget("");
      onClose();
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const unlockDate = new Date(Date.now() + lockDays * 86_400_000);
  const unlockDateLabel = unlockDate.toLocaleDateString(localeTag(locale), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Sheet open={open} onClose={onClose} title={t("savings.createVaultTitle")} subtitle={t("savings.createVaultSubtitle")}>
      <Field label={t("savings.vaultName")} hint={t("savings.vaultNameHint")}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t("savings.vaultNamePlaceholder")}
        />
      </Field>

      <Field label={t("savings.currency")}>
        <Select
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>

      <Field label={t("savings.vaultGoal")} hint={t("savings.vaultGoalHint")}>
        <AmountInput value={target} onChange={setTarget} currency={currency} />
      </Field>

      <Field
        label={t("savings.lockPeriodLabel")}
        hint={t("savings.lockPeriodHint").replace("{date}", unlockDateLabel)}
      >
        <div className="flex flex-wrap gap-2">
          {LOCK_PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setLockDays(p.days)}
              className={`rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                lockDays === p.days
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                  : "border-white/10 bg-slate-900/40 text-slate-400 hover:bg-white/5"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </Field>

      <p className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[10px] leading-relaxed text-amber-300">
        {t("savings.vaultNotice")}
      </p>

      <SubmitButton onClick={submit} loading={saving}>
        {t("savings.createVaultBtn")}
      </SubmitButton>
    </Sheet>
  );
}
