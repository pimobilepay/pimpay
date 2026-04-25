/**
 * PIMPAY Banking Portal - Utility Formatters
 * Designed for CEMAC zone banking operations
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const XAF_EUR_RATE = 655.957;

export const CURRENCY_CONFIGS: Record<
  string,
  { decimals: number; symbol: string; locale: string; separator: string }
> = {
  XAF: { decimals: 0, symbol: 'FCFA', locale: 'fr-CM', separator: '\u00A0' },
  XOF: { decimals: 0, symbol: 'FCFA', locale: 'fr-SN', separator: '\u00A0' },
  EUR: { decimals: 2, symbol: '€', locale: 'fr-FR', separator: '.' },
  USD: { decimals: 2, symbol: '$', locale: 'en-US', separator: '.' },
  GBP: { decimals: 2, symbol: '£', locale: 'en-GB', separator: '.' },
};

export const STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  // Transaction statuses
  pending:     { color: '#F59E0B', label: 'En attente' },
  processing:  { color: '#3B82F6', label: 'En cours de traitement' },
  completed:   { color: '#10B981', label: 'Complété' },
  success:     { color: '#10B981', label: 'Réussi' },
  failed:      { color: '#EF4444', label: 'Échoué' },
  cancelled:   { color: '#6B7280', label: 'Annulé' },
  reversed:    { color: '#8B5CF6', label: 'Annulé et remboursé' },
  refunded:    { color: '#8B5CF6', label: 'Remboursé' },
  expired:     { color: '#9CA3AF', label: 'Expiré' },
  // Account statuses
  active:      { color: '#10B981', label: 'Actif' },
  inactive:    { color: '#9CA3AF', label: 'Inactif' },
  blocked:     { color: '#EF4444', label: 'Bloqué' },
  suspended:   { color: '#F59E0B', label: 'Suspendu' },
  closed:      { color: '#6B7280', label: 'Fermé' },
  // KYC / Verification statuses
  verified:    { color: '#10B981', label: 'Vérifié' },
  unverified:  { color: '#9CA3AF', label: 'Non vérifié' },
  under_review:{ color: '#3B82F6', label: 'En cours de vérification' },
  rejected:    { color: '#EF4444', label: 'Rejeté' },
  // Card statuses
  'card:active':   { color: '#10B981', label: 'Carte active' },
  'card:frozen':   { color: '#60A5FA', label: 'Carte gelée' },
  'card:blocked':  { color: '#EF4444', label: 'Carte bloquée' },
  'card:expired':  { color: '#9CA3AF', label: 'Carte expirée' },
};

// ─── Balance Formatters ───────────────────────────────────────────────────────

/**
 * Formats a crypto balance with 8 decimals for crypto currencies.
 * - Default: 8 decimals for crypto (SDA, PI, etc.)
 * - Examples:
 *   - 1.5 → "1,50000000"
 *   - 0.005 → "0,00500000"
 *   - 0.00001234 → "0,00001234"
 *   - 0.000000001 → "0,00000000" (max 8 decimals)
 */
export function formatBalance(balance: number, locale: string = 'fr-FR'): string {
  if (!isFinite(balance)) return '0,00000000';
  
  // Always use 8 decimals for crypto balances
  return balance.toLocaleString(locale, { 
    minimumFractionDigits: 8, 
    maximumFractionDigits: 8 
  });
}

/**
 * Formats a crypto balance for display in wallet cards.
 * Shows appropriate decimals based on the balance value.
 * @param balance - The balance amount
 * @param currency - The crypto currency code (PI, BTC, ETH, etc.)
 * @param locale - The locale for number formatting
 */
export function formatCryptoBalance(
  balance: number, 
  currency: string = 'PI', 
  locale: string = 'fr-FR'
): string {
  if (!isFinite(balance)) return '0,00';
  
  // Stablecoins always use 2 decimals
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'XAF', 'XOF'];
  if (stablecoins.includes(currency.toUpperCase())) {
    return balance.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  return formatBalance(balance, locale);
}

// ─── Amount Formatters ────────────────────────────────────────────────────────

/**
 * Formats a monetary amount according to currency rules.
 * XAF/XOF: no decimals, space separator, FCFA suffix.
 * EUR/USD: 2 decimals, standard international format.
 */
export function formatAmount(amount: number, currency: string): string {
  if (!isFinite(amount)) return `— ${getCurrencySymbol(currency)}`;

  const upper = currency.toUpperCase();
  const config = CURRENCY_CONFIGS[upper];

  if (upper === 'XAF' || upper === 'XOF') {
    // Manual space-separated formatting for FCFA
    const rounded = Math.round(amount);
    const isNegative = rounded < 0;
    const abs = Math.abs(rounded);
    const parts = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    return `${isNegative ? '-' : ''}${parts}\u00A0FCFA`;
  }

  if (config) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  }

  // Fallback for unknown currencies
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: upper,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parses a formatted amount string back to a number.
 * Handles FCFA strings, standard locale strings.
 */
export function parseAmount(formatted: string): number {
  if (!formatted || typeof formatted !== 'string') return NaN;

  // Remove currency symbols and labels
  let clean = formatted
    .replace(/FCFA/gi, '')
    .replace(/XAF/gi, '')
    .replace(/XOF/gi, '')
    .replace(/€/g, '')
    .replace(/\$/g, '')
    .replace(/£/g, '')
    .replace(/EUR/gi, '')
    .replace(/USD/gi, '')
    .replace(/GBP/gi, '')
    .trim();

  // Determine decimal separator
  const lastComma = clean.lastIndexOf(',');
  const lastDot   = clean.lastIndexOf('.');

  if (lastComma > lastDot) {
    // European format: 1.500.000,50 → comma is decimal separator
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    // Standard format: 1,500,000.50 → dot is decimal separator
    clean = clean.replace(/,/g, '');
  }

  // Remove non-breaking spaces, regular spaces, narrow no-break spaces
  clean = clean.replace(/[\u00A0\u202F\u2009 ]/g, '');

  const result = parseFloat(clean);
  return isNaN(result) ? NaN : result;
}

/**
 * Converts XAF to EUR using the fixed CFA rate.
 */
export function formatXAFtoEUR(
  amountXAF: number,
  returnFormatted = true
): string | number {
  if (!isFinite(amountXAF)) return returnFormatted ? '— €' : NaN;
  const eur = amountXAF / XAF_EUR_RATE;
  return returnFormatted ? formatAmount(eur, 'EUR') : eur;
}

/**
 * Converts EUR to XAF using the fixed CFA rate.
 */
export function formatEURtoXAF(
  amountEUR: number,
  returnFormatted = true
): string | number {
  if (!isFinite(amountEUR)) return returnFormatted ? '— FCFA' : NaN;
  const xaf = amountEUR * XAF_EUR_RATE;
  return returnFormatted ? formatAmount(xaf, 'XAF') : xaf;
}

// ─── IBAN & BIC Formatters ────────────────────────────────────────────────────

/**
 * Formats an IBAN string into groups of 4 characters.
 * Example: CM2110003001000500000605 → CM21 1000 3001 0005 0000 0605
 */
export function formatIBAN(iban: string): string {
  if (!iban || typeof iban !== 'string') return '';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join('\u00A0') ?? clean;
}

/**
 * Validates and formats a BIC/SWIFT code.
 * Must be 8 or 11 alphanumeric characters.
 * Returns formatted BIC or throws if invalid.
 */
export function formatBIC(bic: string): string {
  if (!bic || typeof bic !== 'string') {
    throw new Error('BIC invalide : valeur manquante');
  }
  const clean = bic.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)) {
    throw new Error(
      `BIC invalide : "${bic}". Un BIC doit contenir 8 ou 11 caractères alphanumériques.`
    );
  }
  if (clean.length !== 8 && clean.length !== 11) {
    throw new Error(
      `BIC invalide : longueur ${clean.length}. Attendu 8 ou 11 caractères.`
    );
  }
  return clean;
}

/**
 * Validates a BIC without throwing — returns null if invalid.
 */
export function tryFormatBIC(bic: string): string | null {
  try {
    return formatBIC(bic);
  } catch {
    return null;
  }
}

// ─── Date Formatters ─────────────────────────────────────────────────────────

/**
 * Formats a date in French locale.
 * - 'short':    15/03/2024
 * - 'long':     15 mars 2024
 * - 'datetime': 15 mars 2024 à 14:30
 * - 'relative': il y a 3 jours / dans 2 heures
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'datetime' | 'relative' = 'short'
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Date invalide';

  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);

    case 'long':
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);

    case 'datetime':
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);

    case 'relative': {
      const now    = Date.now();
      const diff   = d.getTime() - now;
      const absDiff = Math.abs(diff);
      const future  = diff > 0;

      const seconds = Math.floor(absDiff / 1000);
      const minutes = Math.floor(absDiff / 60_000);
      const hours   = Math.floor(absDiff / 3_600_000);
      const days    = Math.floor(absDiff / 86_400_000);
      const weeks   = Math.floor(absDiff / 604_800_000);
      const months  = Math.floor(absDiff / 2_592_000_000);
      const years   = Math.floor(absDiff / 31_536_000_000);

      let label: string;
      if (seconds < 60)        label = `${seconds}\u00A0seconde${seconds > 1 ? 's' : ''}`;
      else if (minutes < 60)   label = `${minutes}\u00A0minute${minutes > 1 ? 's' : ''}`;
      else if (hours < 24)     label = `${hours}\u00A0heure${hours > 1 ? 's' : ''}`;
      else if (days < 7)       label = `${days}\u00A0jour${days > 1 ? 's' : ''}`;
      else if (weeks < 5)      label = `${weeks}\u00A0semaine${weeks > 1 ? 's' : ''}`;
      else if (months < 12)    label = `${months}\u00A0mois`;
      else                     label = `${years}\u00A0an${years > 1 ? 's' : ''}`;

      return future ? `dans ${label}` : `il y a ${label}`;
    }

    default:
      return new Intl.DateTimeFormat('fr-FR').format(d);
  }
}

// ─── Percentage & Duration ────────────────────────────────────────────────────

/**
 * Formats a number as a percentage string.
 * @param value    - The decimal value (e.g., 0.125 for 12.5%)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatPercentage(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—\u00A0%';
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a duration in seconds to a human-readable French string.
 * Example: 3723 → "1 heure 2 minutes 3 secondes"
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return 'Durée invalide';

  const s = Math.floor(seconds);
  const parts: string[] = [];

  const days    = Math.floor(s / 86400);
  const hours   = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs    = s % 60;

  if (days > 0)    parts.push(`${days}\u00A0jour${days > 1 ? 's' : ''}`);
  if (hours > 0)   parts.push(`${hours}\u00A0heure${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes}\u00A0minute${minutes > 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0)
    parts.push(`${secs}\u00A0seconde${secs > 1 ? 's' : ''}`);

  return parts.join(' ');
}

// ─── Account & Transaction Formatters ────────────────────────────────────────

/**
 * Formats an account number based on account type.
 * - iban:   groups of 4
 * - mobile: +237 6XX XXX XXX
 * - card:   **** **** **** 1234
 * - default: XXX-XXXX-XXXX
 */
export function formatAccountNumber(account: string, type: string): string {
  if (!account) return '';
  const clean = account.replace(/\s+/g, '');

  switch (type.toLowerCase()) {
    case 'iban':
      return formatIBAN(clean);

    case 'mobile':
    case 'mobile_money': {
      // Format Cameroonian mobile numbers: +237 6XX XXX XXX
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 9) {
        return `+237\u00A0${digits.slice(0, 3)}\u00A0${digits.slice(3, 6)}\u00A0${digits.slice(6)}`;
      }
      if (digits.startsWith('237') && digits.length === 12) {
        return `+237\u00A0${digits.slice(3, 6)}\u00A0${digits.slice(6, 9)}\u00A0${digits.slice(9)}`;
      }
      return clean;
    }

    case 'card':
    case 'card_number': {
      const masked = clean.replace(/\d(?=.{4})/g, '*');
      return masked.match(/.{1,4}/g)?.join('\u00A0') ?? masked;
    }

    case 'bban': {
      // Format: bank(5) + branch(5) + account(11) + key(2)
      if (clean.length === 23) {
        return `${clean.slice(0, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 21)}-${clean.slice(21)}`;
      }
      return clean;
    }

    default: {
      const chunks = clean.match(/.{1,4}/g);
      return chunks ? chunks.join('-') : clean;
    }
  }
}

/**
 * Formats a transaction ID for display — truncated with ellipsis.
 * Returns an object with display string and the full ID for clipboard use.
 */
export function formatTransactionId(
  id: string,
  maxLength = 12
): { display: string; full: string; truncated: boolean } {
  if (!id) return { display: '', full: '', truncated: false };
  const clean = id.trim();
  if (clean.length <= maxLength) {
    return { display: clean, full: clean, truncated: false };
  }
  const half = Math.floor(maxLength / 2);
  const display = `${clean.slice(0, half)}…${clean.slice(-half)}`;
  return { display, full: clean, truncated: true };
}

// ─── File Size Formatter ──────────────────────────────────────────────────────

/**
 * Formats a file size in bytes to a human-readable French string.
 * Example: 1536 → "1,5 Ko"
 */
export function formatFileSize(bytes: number): string {
  if (!isFinite(bytes) || bytes < 0) return 'Taille inconnue';
  if (bytes === 0) return '0\u00A0o';

  const units = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}\u00A0${units[i]}`;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the hex color associated with a given status string.
 * Falls back to neutral grey for unknown statuses.
 */
export function getStatusColor(status: string): string {
  if (!status) return '#9CA3AF';
  const key = status.toLowerCase().trim();
  return STATUS_CONFIG[key]?.color ?? '#9CA3AF';
}

/**
 * Returns the French label for a given status string.
 * Falls back to the raw status capitalized.
 */
export function getStatusLabel(status: string): string {
  if (!status) return 'Inconnu';
  const key = status.toLowerCase().trim();
  if (STATUS_CONFIG[key]) return STATUS_CONFIG[key].label;
  // Capitalize first letter as fallback
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// ─── Currency Symbol Helper ───────────────────────────────────────────────────

/**
 * Returns the currency symbol for a given ISO currency code.
 */
export function getCurrencySymbol(currency: string): string {
  if (!currency) return '';
  const upper = currency.toUpperCase().trim();
  const config = CURRENCY_CONFIGS[upper];
  if (config) return config.symbol;

  // Derive symbol using Intl for unknown currencies
  try {
    const formatted = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbolPart = formatted.find((p) => p.type === 'currency');
    return symbolPart?.value ?? upper;
  } catch {
    return upper;
  }
}

// ─── Compound / Utility Helpers ─────────────────��─────────────────────────────

/**
 * Formats a complete monetary amount with currency label and optional conversion hint.
 * Example: formatAmountWithHint(150000, 'XAF') → "150 000 FCFA (≈ 228,67 €)"
 */
export function formatAmountWithHint(
  amount: number,
  currency: string,
  showConversion = false
): string {
  const main = formatAmount(amount, currency);
  if (!showConversion) return main;

  const upper = currency.toUpperCase();
  if (upper === 'XAF' || upper === 'XOF') {
    const eur = formatXAFtoEUR(amount) as string;
    return `${main} (≈\u00A0${eur})`;
  }
  if (upper === 'EUR') {
    const xaf = formatEURtoXAF(amount) as string;
    return `${main} (≈\u00A0${xaf})`;
  }
  return main;
}

/**
 * Masks sensitive data for display.
 * Example: maskSensitive('1234567890', 4) → '******7890'
 */
export function maskSensitive(value: string, visibleChars = 4): string {
  if (!value) return '';
  if (value.length <= visibleChars) return value;
  const visible = value.slice(-visibleChars);
  const masked  = '*'.repeat(Math.max(value.length - visibleChars, 0));
  return `${masked}${visible}`;
}

/**
 * Returns a short account label for display in dropdowns/lists.
 * Example: formatAccountLabel('CM21 1000 3001 0005 0000 0605', 'iban') → 'CM21 … 0605'
 */
export function formatAccountLabel(account: string, type: string): string {
  if (!account) return '';
  const formatted = formatAccountNumber(account, type);
  const parts = formatted.replace(/[\u00A0\-]/g, ' ').split(' ').filter(Boolean);
  if (parts.length <= 2) return formatted;
  return `${parts[0]}\u00A0…\u00A0${parts[parts.length - 1]}`;
}
