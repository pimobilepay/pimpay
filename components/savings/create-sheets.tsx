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
  type SavingsTypeKey,
  type WalletView,
} from "./savings-shared";
import { Sheet, Field, TextInput, AmountInput, Select, SubmitButton } from "./savings-ui";

const TYPE_ORDER: SavingsTypeKey[] = ["REGULAR", "GOAL_BASED", "FIXED_DEPOSIT", "RECURRING"];

/** Bornes du verrou d'un coffre, miroir de MIN/MAX_LOCK_DAYS côté API. */
const LOCK_PRESETS = [
  { days: 30, label: "1 mois" },
  { days: 90, label: "3 mois" },
  { days: 180, label: "6 mois" },
  { days: 365, label: "1 an" },
  { days: 730, label: "2 ans" },
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
      if (!res.ok) throw new Error(await readError(res, "Ouverture impossible."));
      toast.success("Compte épargne ouvert");
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
    <Sheet open={open} onClose={onClose} title="Ouvrir un compte épargne" subtitle="Nouveau produit">
      <Field label="Type de produit">
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
                  {meta.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Nom du compte" hint="Optionnel. Par défaut « Compte épargne ».">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ex. Fonds d'urgence"
        />
      </Field>

      <Field
        label="Devise"
        hint={
          wallet
            ? `Portefeuille ${currency} disponible : ${money(wallet.balance, currency)}`
            : `Vous n'avez pas encore de portefeuille ${currency}. Il sera nécessaire pour alimenter ce compte.`
        }
      >
        <Select
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>

      {type === "GOAL_BASED" && (
        <Field label="Montant de l'objectif" hint="Sert à calculer votre progression.">
          <AmountInput value={target} onChange={setTarget} currency={currency} />
        </Field>
      )}

      {type === "FIXED_DEPOSIT" && (
        <Field
          label="Durée du blocage"
          hint="Les fonds restent immobilisés jusqu'à l'échéance. Une clôture anticipée entraîne une pénalité de 5%."
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
                {m} mois
              </button>
            ))}
          </div>
        </Field>
      )}

      {type === "RECURRING" && (
        <>
          <Field label="Versement mensuel" hint="Optionnel.">
            <AmountInput value={autoAmount} onChange={setAutoAmount} currency={currency} />
          </Field>
          {autoAmount && (
            <Field label="Jour du prélèvement" hint="Entre 1 et 28, pour couvrir tous les mois.">
              <Select
                value={autoDay}
                onChange={setAutoDay}
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Le ${i + 1}`,
                }))}
              />
            </Field>
          )}
        </>
      )}

      <p className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-slate-500">
        Le compte est ouvert avec un solde nul. Vous l&apos;alimenterez ensuite depuis votre
        portefeuille {currency}.
      </p>

      <SubmitButton onClick={submit} loading={saving}>
        Ouvrir le compte
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
      if (!res.ok) throw new Error(await readError(res, "Création impossible."));
      toast.success("Coffre-fort créé");
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

  return (
    <Sheet open={open} onClose={onClose} title="Créer un coffre-fort" subtitle="Épargne bloquée">
      <Field label="Nom du coffre" hint="Optionnel. Par défaut « Coffre-fort ».">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ex. Apport immobilier"
        />
      </Field>

      <Field label="Devise">
        <Select
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>

      <Field label="Objectif" hint="Optionnel, pour suivre votre progression.">
        <AmountInput value={target} onChange={setTarget} currency={currency} />
      </Field>

      <Field
        label="Durée du verrou"
        hint={`Déverrouillage automatique le ${unlockDate.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}.`}
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
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <p className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[10px] leading-relaxed text-amber-300">
        Un retrait avant l&apos;échéance reste possible, mais une pénalité de 5% du montant retiré
        sera retenue. Le coffre est rémunéré au barème du dépôt à terme.
      </p>

      <SubmitButton onClick={submit} loading={saving}>
        Créer le coffre-fort
      </SubmitButton>
    </Sheet>
  );
}
