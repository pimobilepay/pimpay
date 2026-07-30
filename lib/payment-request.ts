/**
 * Helpers partages pour la fonctionnalite "Demande de paiement" (mPay).
 * Doit rester aligne avec app/api/payments/request/route.ts
 */

export type PaymentRequestStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";

/** Durees d'expiration proposees a l'utilisateur (cles attendues par l'API). */
export const REQUEST_DURATIONS = [
  { value: "24h", labelKey: "mpay.request.duration24h" },
  { value: "7d", labelKey: "mpay.request.duration7d" },
  { value: "30d", labelKey: "mpay.request.duration30d" },
] as const;

/** Devises acceptees par l'API (ALLOWED_CURRENCIES). */
export const REQUEST_CURRENCIES = [
  "PI",
  "SDA",
  "XAF",
  "XOF",
  "USD",
  "EUR",
  "CDF",
  "NGN",
  "AED",
  "CNY",
  "VND",
  "MGA",
] as const;

const FIAT = ["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND", "MGA"];

/** Formate un montant : 2 decimales pour le fiat, jusqu'a 8 pour le crypto. */
export function formatRequestAmount(amount: number, currency: string): string {
  const maxDecimals = FIAT.includes(currency.toUpperCase()) ? 2 : 8;
  return amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

/** Classes Tailwind + cle de traduction pour chaque statut. */
export function statusMeta(status: PaymentRequestStatus): {
  labelKey: string;
  className: string;
  dot: string;
} {
  switch (status) {
    case "PAID":
      return {
        labelKey: "mpay.request.statusPaid",
        className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-400",
      };
    case "CANCELLED":
      return {
        labelKey: "mpay.request.statusCancelled",
        className: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        dot: "bg-slate-500",
      };
    case "EXPIRED":
      return {
        labelKey: "mpay.request.statusExpired",
        className: "bg-red-500/10 text-red-300 border-red-500/30",
        dot: "bg-red-400",
      };
    default:
      return {
        labelKey: "mpay.request.statusPending",
        className: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        dot: "bg-amber-400",
      };
  }
}

/**
 * Retourne le temps restant avant expiration sous forme lisible,
 * ou null si la demande est deja expiree.
 */
export function timeLeft(
  expiresAt: string | Date,
  t: (key: string) => string
): string | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}${t("mpay.request.days")} ${hours}${t("mpay.request.hours")}`;
  if (hours > 0) return `${hours}${t("mpay.request.hours")} ${minutes}${t("mpay.request.minutes")}`;
  return `${minutes}${t("mpay.request.minutes")}`;
}

/** Construit l'URL partageable d'une demande. */
export function buildRequestUrl(code: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://pimobipay.com";
  return `${origin}/mpay/request/${code}`;
}
