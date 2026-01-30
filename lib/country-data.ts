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
    name: "Nigeria",
    code: "NG",
    flag: "🇳🇬",
    currency: "NGN",
    currencySymbol: "₦",
    piToLocalRate: 1450,
    dialCode: "+234",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "Zenith Bank", bic: "ZENITH", swift: "ZENINLAA" },
      { name: "Access Bank", bic: "ACCESS", swift: "ACCEGHLX" },
      { name: "United Bank for Africa", bic: "UBA", swift: "UBAFNG" }
    ],
    operators: [
      { id: "mtn_ng", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_ng", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
{
  name: "Ghana",
  code: "GH",
  flag: "🇬🇭",
  currency: "GHS",
  currencySymbol: "₵",
  piToLocalRate: 12.5,
  dialCode: "+233",
  continent: "AFRICA",
  isoStandard: "ISO20022",
  isActive: true,
  banks: [
    { name: "GCB Bank", bic: "GHCBGHAC", swift: "GHCBGHAC" },
    { name: "Ecobank Ghana", bic: "ECOCGHAC", swift: "ECOCGHAC" },
  ],
  operators: [
    { id: "mtn_gh", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
    { id: "vodafone_gh", name: "Vodafone Cash", icon: LOGOS.vodacom, features: { cashIn: true, cashOut: true, airtime: true } },
    { id: "airtel_gh", name: "AirtelTigo Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
  ],
 },
 {
  name: "Guinea",
  code: "GN",
  flag: "🇬🇳",
  currency: "GNF",
  currencySymbol: "FG",
  piToLocalRate: 8600,
  dialCode: "+224",
  continent: "AFRICA",
  isoStandard: "ISO20022",
  isActive: false,
  banks: [
    { name: "Banque Centrale de la République de Guinée", bic: "BCRGGNGN", swift: "BCRGGNGN" },
    { name: "Ecobank Guinea", bic: "ECOCGNGN", swift: "ECOCGNGN" },
  ],
  operators: [
    { id: "orange_gn", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
    { id: "mtn_gn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
  ],
  },
  {
  name: "Gabon",
  code: "GA",
  flag: "🇬🇦",
  currency: "XAF",
  currencySymbol: "FCFA",
  piToLocalRate: 605.5,
  dialCode: "+241",
  continent: "AFRICA",
  isoStandard: "ISO20022",
  isActive: true,
  banks: [
    { name: "BGFIBank Gabon", bic: "BGFIGAGX", swift: "BGFIGAGX" },
    { name: "UGB (Union Gabonaise de Banque)", bic: "UGBGGAGX", swift: "UGBGGAGX" },
  ],
  operators: [
    { id: "airtel_ga", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    { id: "moov_ga", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } },
  ],
},
  {
  name: "Angola",
  code: "AO",
  flag: "🇦🇴",
  currency: "AOA",
  currencySymbol: "Kz",
  piToLocalRate: 850,
  dialCode: "+244",
  continent: "AFRICA",
  isoStandard: "ISO20022",
  isActive: true,
  banks: [
    { name: "Banco Angolano de Investimentos", bic: "BAIPAOLU", swift: "BAIPAOLU" },
    { name: "Banco de Fomento Angola", bic: "BCGPAOLU", swift: "BCGPAOLU" },
  ],
  operators: [
    { id: "unitel_ao", name: "Unitel Money", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
    { id: "movicel_ao", name: "Movicel Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
  ],
  },
  {
    name: "Cameroun",
    code: "CM",
    flag: "🇨🇲",
    currency: "XAF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+237",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "Afriland First Bank", bic: "AFRI", swift: "AFRICM" },
      { name: "Société Générale CM", bic: "SGC", swift: "SGCCMC" }
    ],
    operators: [
      { id: "mtn_cm", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange_cm", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Mali",
    code: "ML",
    flag: "🇲🇱",
    currency: "XOF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+223",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "BDM-SA", bic: "BDM", swift: "BDMSAML" }],
    operators: [
      { id: "orange_ml", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_ml", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Burkina Faso",
    code: "BF",
    flag: "🇧🇫",
    currency: "XOF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+226",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "Coris Bank", bic: "CORIS", swift: "CORISBF" }],
    operators: [
      { id: "orange_bf", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_bf", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Bénin",
    code: "BJ",
    flag: "🇧🇯",
    currency: "XOF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+229",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "Ecobank Bénin", bic: "ECOB", swift: "ECOBBJ" }],
    operators: [
      { id: "mtn_bj", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_bj", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Congo (Brazzaville)",
    code: "CG",
    flag: "🇨🇬",
    currency: "XAF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+242",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "BGFIBank Congo", bic: "BGFI CGXX", swift: "BGFICGBZ" },
      { name: "LCB Bank", bic: "LCBC CGXX", swift: "LCBCCGBZ" },
      { name: "Ecobank Congo", bic: "ECOC CGXX", swift: "ECOCCGBZ" },
    ],
    operators: [
      { id: "mtn_cg", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_cg", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
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
      { id: "orange_cd", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_cd", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Côte d'Ivoire",
    code: "CI",
    flag: "🇨🇮",
    currency: "XOF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+225",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "NSIA Banque", bic: "NSIA CIXX", swift: "NSIACIBJ" }],
    operators: [
      { id: "orange_ci", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "mtn_ci", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave_ci", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } },
    ],
  },
  {
    name: "Sénégal",
    code: "SN",
    flag: "🇸🇳",
    currency: "XOF",
    currencySymbol: "FCFA",
    piToLocalRate: 605.5,
    dialCode: "+221",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [{ name: "CBAO", bic: "CBAO SNXX", swift: "CBAOSNDR" }],
    operators: [
      { id: "orange_sn", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave_sn", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } },
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
      { id: "airtel_ke", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
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

export const countries: Country[] = [...coreCountries, ...worldCountries];
export const getActiveCountries = () => countries.filter(c => c.isActive);
export const getCountriesByContinent = (continent: Country["continent"]) =>
  countries.filter(c => c.continent === continent);
