/**
 * Types et helpers partagés par les écrans Épargne / Coffre-fort.
 *
 * Les formes déclarées ici reflètent exactement `serializeSavings` et
 * `serializeVault` de `lib/savings.ts` : toute évolution du serializer doit
 * être répercutée ici.
 */

export interface SavingsAccountView {
  id: string;
  accountNumber: string;
  name: string;
  type: SavingsTypeKey;
  balance: number;
  interestRate: number;
  currency: string;
  targetAmount: number | null;
  totalInterest: number;
  progress: number | null;
  maturityDate: string | null;
  status: "ACTIVE" | "MATURED" | "CLOSED" | "FROZEN";
  autoDebitAmount: number | null;
  autoDebitDay: number | null;
  lastInterestAt: string | null;
  createdAt: string;
  projectedYearlyInterest: number;
}

export interface VaultView {
  id: string;
  name: string;
  amount: number;
  targetAmount: number | null;
  interestRate: number;
  penaltyRate: number;
  currency: string;
  lockUntil: string | null;
  status: "ACTIVE" | "LOCKED" | "UNLOCKED" | "CLOSED";
  isLocked: boolean;
  daysRemaining: number;
  totalInterest: number;
  progress: number | null;
  earlyPenaltyNow: number;
  createdAt: string;
}

export interface WalletView {
  currency: string;
  balance: number;
}

export interface SavingsOverview {
  accounts: SavingsAccountView[];
  vaults: VaultView[];
  wallets: WalletView[];
  totalsByCurrency: Record<string, { saved: number; interest: number }>;
}

/** Simulation renvoyée par GET .../close et .../unlock avant confirmation. */
export interface ExitQuote {
  amount?: number;
  balance?: number;
  penalty: number;
  penaltyRate: number;
  netAmount: number;
  currency: string;
  isEarly?: boolean;
  isLocked?: boolean;
  lockUntil?: string | null;
  maturityDate?: string | null;
}

export type SavingsTypeKey = "REGULAR" | "FIXED_DEPOSIT" | "RECURRING" | "GOAL_BASED";

/** Devises supportées par la plateforme (miroir de lib/validators). */
export const CURRENCIES = ["XAF", "EUR", "USD", "GBP"] as const;

/** Durées possibles d'un dépôt à terme, en mois (miroir de FIXED_TERMS_MONTHS). */
export const TERM_MONTHS = [3, 6, 12, 24, 36] as const;

export const SAVINGS_TYPE_META: Record<
  SavingsTypeKey,
  { label: string; description: string; accent: string }
> = {
  REGULAR: {
    label: "Épargne libre",
    description: "Versements et retraits à tout moment.",
    accent: "text-blue-400",
  },
  FIXED_DEPOSIT: {
    label: "Dépôt à terme",
    description: "Fonds bloqués jusqu'à l'échéance, taux le plus élevé.",
    accent: "text-amber-400",
  },
  RECURRING: {
    label: "Épargne programmée",
    description: "Un versement automatique chaque mois.",
    accent: "text-emerald-400",
  },
  GOAL_BASED: {
    label: "Épargne projet",
    description: "Un objectif chiffré et sa barre de progression.",
    accent: "text-cyan-400",
  },
};

export const SAVINGS_STATUS_META: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Actif", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  MATURED: { label: "Échu", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  FROZEN: { label: "Gelé", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  CLOSED: { label: "Clôturé", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  LOCKED: { label: "Verrouillé", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  UNLOCKED: { label: "Déverrouillé", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

/**
 * Montant formaté. XAF n'a pas de sous-unité : on masque les décimales pour
 * éviter des soldes du type « 15 000,00 FCFA » qui n'ont pas de sens local.
 */
export function money(amount: number, currency: string): string {
  const noDecimals = currency === "XAF";
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  })} ${currency}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Clé d'idempotence par opération : le backend construit une référence
 * déterministe à partir de cette clé, si bien qu'un double-clic est rejeté par
 * la contrainte d'unicité au lieu de produire deux mouvements.
 */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Lit le message d'erreur normalisé des routes (`{ error }`). */
export async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}
