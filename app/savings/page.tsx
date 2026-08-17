"use client";

/**
 * /savings — Écran Épargne & Coffre-fort de l'utilisateur.
 *
 * S'appuie sur GET /api/savings, qui renvoie en une seule requête les comptes,
 * les coffres, les portefeuilles FIAT et les totaux par devise. Après chaque
 * mouvement, on revalide cette source unique plutôt que de recalculer les
 * soldes côté client : le serveur reste la seule autorité sur l'argent.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  PiggyBank,
  Lock,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { SavingsCard, VaultCard } from "@/components/savings/product-cards";
import { CreateSavingsSheet, CreateVaultSheet } from "@/components/savings/create-sheets";
import { DepositSheet, ExitSheet } from "@/components/savings/action-sheets";
import { EmptyState } from "@/components/savings/savings-ui";
import {
  money,
  type SavingsOverview,
  type SavingsAccountView,
  type VaultView,
} from "@/components/savings/savings-shared";
import { useLanguage } from "@/context/LanguageContext";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Chargement impossible");
  return res.json();
};

/** Décrit la feuille d'opération actuellement ouverte. */
type ActiveSheet =
  | { kind: "deposit"; account: SavingsAccountView }
  | { kind: "withdraw"; account: SavingsAccountView }
  | { kind: "close"; account: SavingsAccountView }
  | { kind: "lock"; vault: VaultView }
  | { kind: "unlock"; vault: VaultView }
  | null;

export default function SavingsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"savings" | "vaults">("savings");
  const [creating, setCreating] = useState<"savings" | "vault" | null>(null);
  const [sheet, setSheet] = useState<ActiveSheet>(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR<SavingsOverview>(
    "/api/savings",
    fetcher
  );

  const accounts = data?.accounts ?? [];
  const vaults = data?.vaults ?? [];
  const wallets = data?.wallets ?? [];

  /** Solde du portefeuille FIAT d'une devise, 0 si le portefeuille n'existe pas. */
  const walletBalance = (currency: string) =>
    wallets.find((w) => w.currency === currency)?.balance ?? 0;

  // Les totaux sont agrégés par devise : additionner des devises différentes
  // n'aurait aucun sens financier.
  const totals = useMemo(
    () => Object.entries(data?.totalsByCurrency ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    [data?.totalsByCurrency]
  );

  const refresh = () => mutate();

  return (
    <div className="min-h-screen bg-[#020617] pb-32 text-white">
      {/* En-tête */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020617]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 pt-4">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Retour au tableau de bord"
            className="rounded-2xl bg-white/5 p-2.5 text-white transition-transform active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[4px] text-blue-500">PIMPAY</p>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">
              Épargne &amp; Coffres
            </h1>
          </div>
          <button
            onClick={refresh}
            aria-label="Rafraîchir"
            className="rounded-2xl bg-white/5 p-2.5 text-white transition-transform active:scale-95"
          >
            <RefreshCw size={18} className={isValidating ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {/* Totaux par devise */}
        {totals.length > 0 && (
          <section aria-label="Total épargné" className="mb-5 space-y-2">
            {totals.map(([currency, t]) => (
              <div
                key={currency}
                className="rounded-3xl border border-blue-500/15 bg-gradient-to-br from-blue-600/10 to-transparent px-5 py-4"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Total épargné · {currency}
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-white">
                  {money(t.saved, currency)}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <TrendingUp size={11} />
                  {money(t.interest, currency)} d&apos;intérêts perçus
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Onglets */}
        <div className="mb-5 flex gap-2 rounded-2xl border border-white/5 bg-slate-900/60 p-1">
          {[
            { id: "savings" as const, label: "Comptes épargne", icon: <PiggyBank size={14} />, count: accounts.length },
            { id: "vaults" as const, label: "Coffres-forts", icon: <Lock size={14} />, count: vaults.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && <span className="tabular-nums opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Création */}
        <button
          onClick={() => setCreating(tab === "savings" ? "savings" : "vault")}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3.5 text-[10px] font-black uppercase tracking-widest text-blue-400 transition-colors hover:bg-white/5"
        >
          <Plus size={14} />
          {tab === "savings" ? "Ouvrir un compte épargne" : "Créer un coffre-fort"}
        </button>

        {/* Contenu */}
        {isLoading ? (
          <div className="flex justify-center py-16 text-blue-500">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : error ? (
          <EmptyState
            label="Chargement impossible"
            hint="Vérifiez votre connexion puis rafraîchissez la page."
          />
        ) : tab === "savings" ? (
          accounts.length === 0 ? (
            <EmptyState
              label="Aucun compte épargne"
              hint="Ouvrez un compte pour mettre de l'argent de côté et percevoir des intérêts chaque jour."
            />
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <SavingsCard
                  key={account.id}
                  account={account}
                  onDeposit={() => setSheet({ kind: "deposit", account })}
                  onWithdraw={() => setSheet({ kind: "withdraw", account })}
                  onClose={() => setSheet({ kind: "close", account })}
                />
              ))}
            </div>
          )
        ) : vaults.length === 0 ? (
          <EmptyState
            label="Aucun coffre-fort"
            hint="Un coffre bloque vos fonds jusqu'à une date choisie, au meilleur taux."
          />
        ) : (
          <div className="space-y-4">
            {vaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onLock={() => setSheet({ kind: "lock", vault })}
                onUnlock={() => setSheet({ kind: "unlock", vault })}
              />
            ))}
          </div>
        )}
      </main>

      {/* --- Feuilles de création --- */}
      <CreateSavingsSheet
        open={creating === "savings"}
        onClose={() => setCreating(null)}
        onCreated={refresh}
        wallets={wallets}
      />
      <CreateVaultSheet
        open={creating === "vault"}
        onClose={() => setCreating(null)}
        onCreated={refresh}
      />

      {/* --- Feuilles de mouvement --- */}
      {sheet?.kind === "deposit" && (
        <DepositSheet
          open
          onClose={() => setSheet(null)}
          onDone={refresh}
          endpoint={`/api/savings/${sheet.account.id}/deposit`}
          title="Déposer sur l'épargne"
          subtitle={sheet.account.name}
          currency={sheet.account.currency}
          walletBalance={walletBalance(sheet.account.currency)}
          actionLabel="Confirmer le dépôt"
        />
      )}

      {sheet?.kind === "withdraw" && (
        <ExitSheet
          open
          onClose={() => setSheet(null)}
          onDone={refresh}
          endpoint={`/api/savings/${sheet.account.id}/withdraw`}
          title="Retirer de l'épargne"
          subtitle={sheet.account.name}
          currency={sheet.account.currency}
          maxAmount={sheet.account.balance}
          mode="partial"
          actionLabel="Confirmer le retrait"
        />
      )}

      {sheet?.kind === "close" && (
        <ExitSheet
          open
          onClose={() => setSheet(null)}
          onDone={refresh}
          endpoint={`/api/savings/${sheet.account.id}/close`}
          quoteEndpoint={`/api/savings/${sheet.account.id}/close`}
          title="Clôturer le compte"
          subtitle={sheet.account.name}
          currency={sheet.account.currency}
          maxAmount={sheet.account.balance}
          mode="full"
          actionLabel="Clôturer définitivement"
          danger
        />
      )}

      {sheet?.kind === "lock" && (
        <DepositSheet
          open
          onClose={() => setSheet(null)}
          onDone={refresh}
          endpoint={`/api/vaults/${sheet.vault.id}/lock`}
          title="Alimenter le coffre"
          subtitle={sheet.vault.name}
          currency={sheet.vault.currency}
          walletBalance={walletBalance(sheet.vault.currency)}
          actionLabel="Verrouiller les fonds"
        />
      )}

      {sheet?.kind === "unlock" && (
        <ExitSheet
          open
          onClose={() => setSheet(null)}
          onDone={refresh}
          endpoint={`/api/vaults/${sheet.vault.id}/unlock`}
          quoteEndpoint={`/api/vaults/${sheet.vault.id}/unlock`}
          title="Débloquer le coffre"
          subtitle={sheet.vault.name}
          currency={sheet.vault.currency}
          maxAmount={sheet.vault.amount}
          mode="partial"
          actionLabel="Confirmer le déblocage"
          danger={sheet.vault.isLocked}
        />
      )}

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <BottomNav onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
