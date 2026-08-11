/**
 * PIMPAY — Classification centralisée des devises (crypto vs fiat).
 *
 * Ce helper existe parce que la logique « crypto ou pas ? » était dupliquée dans
 * au moins 4 fichiers avec des listes divergentes (app/deposit/success,
 * app/transfer/success, api/transaction/swap/quote...). Résultat concret : un
 * dépôt TRX était classé comme « MOBILE » dans l'historique admin, parce que la
 * liste utilisée là-bas ne connaissait que "PI".
 */

/** Cryptos et stablecoins supportés par la plateforme. */
export const CRYPTO_CURRENCIES = [
  "PI", "SDA", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM", "TRX",
  "ADA", "DOGE", "TON", "MATIC", "AVAX", "DOT", "LTC",
  "USDT", "USDC", "DAI", "BUSD", "EURC", "OUSD",
] as const;

/** Devises fiat (mobile money, banque, cash). */
export const FIAT_CURRENCIES = [
  "XAF", "XOF", "USD", "EUR", "GBP", "NGN", "GHS", "KES",
  "ZAR", "MAD", "TND", "EGP", "RWF", "UGX", "TZS", "CDF", "GNF",
] as const;

const CRYPTO_SET = new Set<string>(CRYPTO_CURRENCIES);
const FIAT_SET = new Set<string>(FIAT_CURRENCIES);

/** true si la devise est une crypto ou un stablecoin. */
export function isCryptoCurrency(currency?: string | null): boolean {
  if (!currency) return false;
  return CRYPTO_SET.has(currency.trim().toUpperCase());
}

/** true si la devise est une monnaie fiat. */
export function isFiatCurrency(currency?: string | null): boolean {
  if (!currency) return false;
  return FIAT_SET.has(currency.trim().toUpperCase());
}

/**
 * Réseau blockchain porteur d'une crypto donnée — utilisé pour afficher
 * « USDT (TRC20) » plutôt qu'un simple « USDT » ambigu.
 */
const NETWORK_BY_CURRENCY: Record<string, string> = {
  PI:   "Pi Network",
  SDA:  "Sidra Chain",
  BTC:  "Bitcoin",
  ETH:  "Ethereum",
  BNB:  "BNB Chain",
  SOL:  "Solana",
  XRP:  "XRP Ledger",
  XLM:  "Stellar",
  TRX:  "TRON",
  ADA:  "Cardano",
  DOGE: "Dogecoin",
  TON:  "TON",
  USDT: "TRON (TRC20)",
  USDC: "Ethereum (ERC20)",
  DAI:  "Ethereum (ERC20)",
  BUSD: "BNB Chain (BEP20)",
};

/** Libellé réseau lisible pour une crypto (ex. "TRX" -> "TRON"). */
export function getNetworkLabel(currency?: string | null): string | null {
  if (!currency) return null;
  const cur = currency.trim().toUpperCase();
  return NETWORK_BY_CURRENCY[cur] || (CRYPTO_SET.has(cur) ? cur : null);
}

/**
 * Détermine la méthode réellement utilisée par une transaction, en français et
 * prête à l'affichage. L'ordre d'évaluation est important : on s'appuie d'abord
 * sur les signaux explicites (metadata), puis sur la nature de la devise, et
 * seulement en dernier recours sur un défaut. On ne suppose JAMAIS « MOBILE »
 * quand la devise est une crypto.
 */
export function resolveTransactionMethod(input: {
  currency?: string | null;
  type?: string | null;
  accountNumber?: string | null;
  blockchainTx?: string | null;
  metadata?: Record<string, any> | null;
}): { method: string; kind: "CRYPTO" | "MOBILE_MONEY" | "BANK" | "INTERNAL" | "CARD" | "CASH" } {
  const meta = input.metadata || {};
  const transferDetails = meta.transferDetails || {};
  const currency = (input.currency || "").trim().toUpperCase();

  // 1. Signaux blockchain explicites : flags metadata, hash on-chain, adresse externe.
  const hasBlockchainSignal =
    meta.isBlockchainWithdraw === true ||
    meta.isExternal === true ||
    meta.isCrypto === true ||
    Boolean(meta.externalAddress) ||
    Boolean(meta.txHash) ||
    Boolean(input.blockchainTx);

  // 2. Signaux mobile money explicites : opérateur ou numéro de téléphone.
  const hasMobileSignal =
    meta.method === "mobile" ||
    meta.method === "mobile_money" ||
    meta.method === "MOBILE_MONEY" ||
    Boolean(transferDetails.phone) ||
    Boolean(transferDetails.provider) ||
    Boolean(meta.phoneNumber) ||
    Boolean(meta.phone) ||
    Boolean(meta.operator);

  // 3. Signaux bancaires.
  const hasBankSignal =
    meta.method === "bank" ||
    meta.method === "bank_transfer" ||
    Boolean(transferDetails.bankName) ||
    Boolean(transferDetails.iban) ||
    Boolean(meta.bankName);

  // La devise crypto est un signal fort : un dépôt en TRX est un dépôt crypto,
  // même si aucun flag metadata n'a été posé par le service qui l'a créé.
  if (isCryptoCurrency(currency)) {
    // Un transfert interne entre deux comptes PIMPAY n'est pas on-chain.
    const isInternal =
      !hasBlockchainSignal &&
      !input.blockchainTx &&
      (meta.internal === true || meta.isInternal === true);
    if (isInternal) {
      return { method: `${currency} (interne PIMOBIPAY)`, kind: "INTERNAL" };
    }
    const network = getNetworkLabel(currency);
    return { method: network ? `Crypto — ${network}` : "Crypto", kind: "CRYPTO" };
  }

  if (hasBlockchainSignal) {
    const network = meta.network || getNetworkLabel(currency) || currency || "Blockchain";
    return { method: `Crypto — ${network}`, kind: "CRYPTO" };
  }

  if (hasMobileSignal) {
    const provider =
      transferDetails.provider || meta.provider || meta.operator || null;
    return {
      method: provider ? `Mobile Money — ${provider}` : "Mobile Money",
      kind: "MOBILE_MONEY",
    };
  }

  if (hasBankSignal) {
    const bank = transferDetails.bankName || meta.bankName || null;
    return {
      method: bank ? `Virement bancaire — ${bank}` : "Virement bancaire",
      kind: "BANK",
    };
  }

  if (meta.method === "card" || input.type === "CARD_PURCHASE") {
    return { method: "Carte bancaire", kind: "CARD" };
  }

  if (meta.method === "cash" || meta.method === "agent") {
    return { method: "Espèces (agent)", kind: "CASH" };
  }

  // Dernier recours : on reste neutre plutôt que d'inventer « MOBILE ».
  if (meta.method || meta.provider) {
    return { method: String(meta.method || meta.provider), kind: "INTERNAL" };
  }

  return {
    method: currency ? `Transfert interne (${currency})` : "Transfert interne",
    kind: "INTERNAL",
  };
}
