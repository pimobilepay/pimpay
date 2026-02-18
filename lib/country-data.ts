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
  { name: "United States", code: "US", flag: "US", currency: "USD", currencySymbol: "$", piToLocalRate: 1, dialCode: "+1", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Canada", code: "CA", flag: "CA", currency: "CAD", currencySymbol: "$", piToLocalRate: 1.36, dialCode: "+1", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Brazil", code: "BR", flag: "BR", currency: "BRL", currencySymbol: "R$", piToLocalRate: 5, dialCode: "+55", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Mexico", code: "MX", flag: "MX", currency: "MXN", currencySymbol: "$", piToLocalRate: 17.2, dialCode: "+52", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Argentina", code: "AR", flag: "AR", currency: "ARS", currencySymbol: "$", piToLocalRate: 870, dialCode: "+54", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Colombia", code: "CO", flag: "CO", currency: "COP", currencySymbol: "$", piToLocalRate: 3900, dialCode: "+57", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Chile", code: "CL", flag: "CL", currency: "CLP", currencySymbol: "$", piToLocalRate: 930, dialCode: "+56", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Peru", code: "PE", flag: "PE", currency: "PEN", currencySymbol: "S/", piToLocalRate: 3.7, dialCode: "+51", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "United Kingdom", code: "GB", flag: "GB", currency: "GBP", currencySymbol: "\u00a3", piToLocalRate: 0.79, dialCode: "+44", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Germany", code: "DE", flag: "DE", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+49", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Italy", code: "IT", flag: "IT", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+39", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Spain", code: "ES", flag: "ES", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+34", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Netherlands", code: "NL", flag: "NL", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+31", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Belgium", code: "BE", flag: "BE", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+32", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Switzerland", code: "CH", flag: "CH", currency: "CHF", currencySymbol: "CHF", piToLocalRate: 0.88, dialCode: "+41", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Portugal", code: "PT", flag: "PT", currency: "EUR", currencySymbol: "\u20ac", piToLocalRate: 0.93, dialCode: "+351", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Poland", code: "PL", flag: "PL", currency: "PLN", currencySymbol: "z\u0142", piToLocalRate: 4.0, dialCode: "+48", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Sweden", code: "SE", flag: "SE", currency: "SEK", currencySymbol: "kr", piToLocalRate: 10.5, dialCode: "+46", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Turkey", code: "TR", flag: "TR", currency: "TRY", currencySymbol: "\u20ba", piToLocalRate: 32, dialCode: "+90", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Russia", code: "RU", flag: "RU", currency: "RUB", currencySymbol: "\u20bd", piToLocalRate: 92, dialCode: "+7", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Ukraine", code: "UA", flag: "UA", currency: "UAH", currencySymbol: "\u20b4", piToLocalRate: 41, dialCode: "+380", continent: "EUROPE", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "China", code: "CN", flag: "CN", currency: "CNY", currencySymbol: "\u00a5", piToLocalRate: 7.1, dialCode: "+86", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Japan", code: "JP", flag: "JP", currency: "JPY", currencySymbol: "\u00a5", piToLocalRate: 150, dialCode: "+81", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "India", code: "IN", flag: "IN", currency: "INR", currencySymbol: "\u20b9", piToLocalRate: 83, dialCode: "+91", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "South Korea", code: "KR", flag: "KR", currency: "KRW", currencySymbol: "\u20a9", piToLocalRate: 1340, dialCode: "+82", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Indonesia", code: "ID", flag: "ID", currency: "IDR", currencySymbol: "Rp", piToLocalRate: 15700, dialCode: "+62", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Vietnam", code: "VN", flag: "VN", currency: "VND", currencySymbol: "\u20ab", piToLocalRate: 25450, dialCode: "+84", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Thailand", code: "TH", flag: "TH", currency: "THB", currencySymbol: "\u0e3f", piToLocalRate: 36, dialCode: "+66", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Philippines", code: "PH", flag: "PH", currency: "PHP", currencySymbol: "\u20b1", piToLocalRate: 57, dialCode: "+63", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Malaysia", code: "MY", flag: "MY", currency: "MYR", currencySymbol: "RM", piToLocalRate: 4.7, dialCode: "+60", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Singapore", code: "SG", flag: "SG", currency: "SGD", currencySymbol: "$", piToLocalRate: 1.35, dialCode: "+65", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Pakistan", code: "PK", flag: "PK", currency: "PKR", currencySymbol: "\u20a8", piToLocalRate: 280, dialCode: "+92", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Bangladesh", code: "BD", flag: "BD", currency: "BDT", currencySymbol: "\u09f3", piToLocalRate: 110, dialCode: "+880", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Saudi Arabia", code: "SA", flag: "SA", currency: "SAR", currencySymbol: "\ufdfc", piToLocalRate: 3.75, dialCode: "+966", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "UAE", code: "AE", flag: "AE", currency: "AED", currencySymbol: "AED", piToLocalRate: 3.67, dialCode: "+971", continent: "ASIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Australia", code: "AU", flag: "AU", currency: "AUD", currencySymbol: "$", piToLocalRate: 1.5, dialCode: "+61", continent: "OCEANIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "New Zealand", code: "NZ", flag: "NZ", currency: "NZD", currencySymbol: "$", piToLocalRate: 1.65, dialCode: "+64", continent: "OCEANIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "South Africa", code: "ZA", flag: "ZA", currency: "ZAR", currencySymbol: "R", piToLocalRate: 18.5, dialCode: "+27", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Tanzania", code: "TZ", flag: "TZ", currency: "TZS", currencySymbol: "TSh", piToLocalRate: 2560, dialCode: "+255", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "vodacom_tz", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Uganda", code: "UG", flag: "UG", currency: "UGX", currencySymbol: "USh", piToLocalRate: 3700, dialCode: "+256", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "mtn_ug", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } }, { id: "airtel_ug", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Rwanda", code: "RW", flag: "RW", currency: "RWF", currencySymbol: "RF", piToLocalRate: 1280, dialCode: "+250", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "mtn_rw", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Ethiopia", code: "ET", flag: "ET", currency: "ETB", currencySymbol: "Br", piToLocalRate: 57, dialCode: "+251", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "telebirr_et", name: "Telebirr", icon: LOGOS.telebirr, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Morocco", code: "MA", flag: "MA", currency: "MAD", currencySymbol: "MAD", piToLocalRate: 10, dialCode: "+212", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Tunisia", code: "TN", flag: "TN", currency: "TND", currencySymbol: "DT", piToLocalRate: 3.1, dialCode: "+216", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Egypt", code: "EG", flag: "EG", currency: "EGP", currencySymbol: "LE", piToLocalRate: 49, dialCode: "+20", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Madagascar", code: "MG", flag: "MG", currency: "MGA", currencySymbol: "Ar", piToLocalRate: 4500, dialCode: "+261", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "orange_mg", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Togo", code: "TG", flag: "TG", currency: "XOF", currencySymbol: "FCFA", piToLocalRate: 605.5, dialCode: "+228", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "moov_tg", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Niger", code: "NE", flag: "NE", currency: "XOF", currencySymbol: "FCFA", piToLocalRate: 605.5, dialCode: "+227", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "airtel_ne", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Tchad", code: "TD", flag: "TD", currency: "XAF", currencySymbol: "FCFA", piToLocalRate: 605.5, dialCode: "+235", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "airtel_td", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Zambia", code: "ZM", flag: "ZM", currency: "ZMW", currencySymbol: "ZK", piToLocalRate: 26, dialCode: "+260", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "mtn_zm", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } }, { id: "airtel_zm", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Mozambique", code: "MZ", flag: "MZ", currency: "MZN", currencySymbol: "MT", piToLocalRate: 64, dialCode: "+258", continent: "AFRICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [{ id: "vodacom_mz", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Haiti", code: "HT", flag: "HT", currency: "HTG", currencySymbol: "G", piToLocalRate: 132, dialCode: "+509", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Dominican Republic", code: "DO", flag: "DO", currency: "DOP", currencySymbol: "$", piToLocalRate: 59, dialCode: "+1-809", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Jamaica", code: "JM", flag: "JM", currency: "JMD", currencySymbol: "$", piToLocalRate: 156, dialCode: "+1-876", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
];

export const countries: Country[] = [...coreCountries, ...worldCountries];
export const getActiveCountries = () => countries.filter(c => c.isActive);
export const getCountriesByContinent = (continent: Country["continent"]) =>
  countries.filter(c => c.continent === continent);
export const searchCountries = (query: string): Country[] => {
  if (!query) return countries;
  const q = query.toLowerCase();
  return countries.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.currency.toLowerCase().includes(q) ||
    c.dialCode.includes(q)
  );
};
