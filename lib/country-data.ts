// lib/country-data.ts

export interface Bank {
  name: string;
  bic: string; // ISO 20022 - Business Identifier Code
  swift: string;
  ibanStructure?: string; // Format pour validation
}

export interface MobileOperator {
  id: string;
  name: string;
  icon: string;
  features: {
    cashIn: boolean;
    cashOut: boolean;
    airtime: boolean;
  };
}

export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  flag: string;
  currency: string; // ISO 4217
  currencySymbol: string;
  piToLocalRate: number; // taux indicatif
  dialCode: string;
  continent: "AFRICA" | "EUROPE" | "AMERICA" | "ASIA" | "OCEANIA";
  banks: Bank[];
  operators: MobileOperator[];
  isoStandard: "ISO20022";
  isActive?: boolean;
}

// Logos génériques
const LOGOS = {
  orange: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg",
  mtn: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg",
  airtel: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Airtel_logo-01.png",
  moov: "https://upload.wikimedia.org/wikipedia/fr/1/1d/Moov_Africa_logo.png",
  wave: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Wave_Logo_RGB.png/512px-Wave_Logo_RGB.png",
  mpesa: "https://upload.wikimedia.org/wikipedia/commons/0/03/M-pesa-logo.png",
  telebirr: "https://upload.wikimedia.org/wikipedia/en/3/34/Telebirr_logo.png",
  vodacom: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
};

// --- PAYS CORE (actifs par défaut) ---
export const coreCountries: Country[] = [
  {
    name: "Congo (DRC)",
    code: "CD",
    flag: "🇨🇩",
    currency: "CDF",
    currencySymbol: "FC",
    piToLocalRate: 2309,
    dialCode: "+243",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "Rawbank", bic: "RAWBCDCX", swift: "RAWBCDCX" },
      { name: "Trust Merchant Bank", bic: "TMBRCDNX", swift: "TMBRCDNX" },
      { name: "Equity BCDC", bic: "EBCDCXAA", swift: "EBCDCX" },
    ],
    operators: [
      { id: "vodacom", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Kenya",
    code: "KE",
    flag: "🇰🇪",
    currency: "KES",
    currencySymbol: "KSh",
    piToLocalRate: 130,
    dialCode: "+254",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "KCB Bank", bic: "KCBKKENX", swift: "KCBKKENX" }],
    operators: [
      { id: "safaricom", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "France",
    code: "FR",
    flag: "🇫🇷",
    currency: "EUR",
    currencySymbol: "€",
    piToLocalRate: 0.93,
    dialCode: "+33",
    continent: "EUROPE",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "BNP Paribas", bic: "BNPAFRPP", swift: "BNPAFRPP", ibanStructure: "FR" },
      { name: "Revolut", bic: "REVOUM22", swift: "REVOUM22", ibanStructure: "FR" },
    ],
    operators: [],
  },
];

// --- AUTRES PAYS DU MONDE (inactifs par défaut) ---
export const worldCountries: Country[] = [
  { name: "United States", code: "US", flag: "🇺🇸", currency: "USD", currencySymbol: "$", piToLocalRate: 1, dialCode: "+1", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Canada", code: "CA", flag: "🇨🇦", currency: "CAD", currencySymbol: "$", piToLocalRate: 1.36, dialCode: "+1", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Brazil", code: "BR", flag: "🇧🇷", currency: "BRL", currencySymbol: "R$", piToLocalRate: 5, dialCode: "+55", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", currency: "GBP", currencySymbol: "£", piToLocalRate: 0.79, dialCode: "+44", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Germany", code: "DE", flag: "🇩🇪", currency: "EUR", currencySymbol: "€", piToLocalRate: 0.93, dialCode: "+49", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "China", code: "CN", flag: "🇨🇳", currency: "CNY", currencySymbol: "¥", piToLocalRate: 7.1, dialCode: "+86", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Japan", code: "JP", flag: "🇯🇵", currency: "JPY", currencySymbol: "¥", piToLocalRate: 150, dialCode: "+81", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "India", code: "IN", flag: "🇮🇳", currency: "INR", currencySymbol: "₹", piToLocalRate: 83, dialCode: "+91", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Australia", code: "AU", flag: "🇦🇺", currency: "AUD", currencySymbol: "$", piToLocalRate: 1.5, dialCode: "+61", continent: "OCEANIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
];

// --- EXPORT GLOBAL ---
export const countries: Country[] = [...coreCountries, ...worldCountries];

// --- SELECTORS ---
export const getActiveCountries = () => countries.filter(c => c.isActive);

export const getCountriesByContinent = (continent: Country["continent"]) =>
  countries.filter(c => c.continent === continent);
