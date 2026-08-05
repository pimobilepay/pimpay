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

/**
 * Devises fiat gerees par la plateforme (alignees sur getWalletType()).
 * Toute devise absente de cette liste est traitee comme un actif crypto
 * (PI, SDA, BTC, ETH, USDT, ...) et affichee avec jusqu'a 8 decimales.
 */
export const FIAT_CURRENCIES = [
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

/** Vrai si la devise est un fiat (2 decimales) et non un actif crypto. */
export function isFiatCurrency(currency?: string | null): boolean {
  return FIAT_CURRENCIES.includes(
    String(currency || "").toUpperCase() as (typeof FIAT_CURRENCIES)[number]
  );
}

/**
 * Normalise un code devise venant d'une URL, d'une API ou de la base.
 * Ne force JAMAIS "PI" silencieusement quand une devise est fournie :
 * c'est ce repli implicite qui affichait "Pi" sur un reglement en XAF.
 */
export function normalizeCurrency(currency?: string | null, fallback = "PI"): string {
  const code = String(currency || "").trim().toUpperCase();
  return code || fallback;
}

/** Formate un montant : 2 decimales pour le fiat, jusqu'a 8 pour le crypto. */
export function formatRequestAmount(amount: number, currency: string): string {
  const maxDecimals = isFiatCurrency(currency) ? 2 : 8;
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

/**
 * Un code de demande est genere par nanoid(10) : 10 caracteres pris dans
 * [A-Za-z0-9_-]. On reste strict pour ne pas confondre avec un id utilisateur.
 */
const REQUEST_CODE_RE = /^[A-Za-z0-9_-]{6,24}$/;

/**
 * Extrait le code d'une demande de paiement a partir d'une valeur scannee.
 *
 * Formats acceptes :
 *  - URL complete    : https://pimobipay.com/mpay/request/AbC123_x-9 (avec query/hash)
 *  - Chemin relatif  : /mpay/request/AbC123_x-9
 *  - Deep link       : pimpay://request/AbC123_x-9
 *  - Payload JSON    : {"app":"PIMOBIPAY","type":"payment-request","code":"..."}
 *
 * Retourne null si la valeur n'est pas une demande de paiement (QR utilisateur,
 * adresse Pi, identifiant marchand...), afin que l'appelant garde son
 * comportement habituel.
 */
export function parsePaymentRequestCode(raw: string): string | null {
  if (!raw) return null;
  const value = raw.trim();

  // 1. Payload JSON explicite
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as { type?: string; code?: string; request?: string };
      const candidate = parsed?.code ?? parsed?.request;
      if (
        typeof candidate === "string" &&
        (parsed.type === "payment-request" ||
          parsed.type === "request" ||
          parsed.type === "paymentRequest") &&
        REQUEST_CODE_RE.test(candidate)
      ) {
        return candidate;
      }
    } catch {
      // pas du JSON valide : on continue
    }
    return null;
  }

  // 2. URL, chemin relatif ou deep link contenant .../request/<code>
  //    Couvre https://host/mpay/request/CODE, /mpay/request/CODE?x=1,
  //    pimpay://request/CODE et pimpay:request=CODE.
  const path = value.match(/request[/:=]([A-Za-z0-9_-]{6,24})(?:[/?#&]|$)/i);
  if (path?.[1]) return path[1];

  // 3. Parametre de requete explicite : ...?request=CODE ou ?requestCode=CODE
  const query = value.match(/[?&]request(?:Code)?=([A-Za-z0-9_-]{6,24})(?:[&#]|$)/i);
  if (query?.[1]) return query[1];

  return null;
}
