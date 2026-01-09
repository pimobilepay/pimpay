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
    cashIn: boolean;    // Dépôt vers Pimpay
    cashOut: boolean;   // Retrait vers Mobile Money
    airtime: boolean;   // Recharge de crédit téléphonique
  };
}

export interface Country {
  name: string;
  code: string;
  currency: string;
  piToLocalRate: number;
  dialCode: string;
  continent: "AFRICA" | "EUROPE" | "AMERICA" | "ASIA";
  banks: Bank[];
  operators: MobileOperator[];
  isoStandard: "ISO20022"; // Standard par défaut pour Pimpay
}

const LOGOS = {
  orange: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg",
  mtn: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg",
  airtel: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Airtel_logo-01.png",
  moov: "https://upload.wikimedia.org/wikipedia/fr/1/1d/Moov_Africa_logo.png",
  wave: "https://en.wikipedia.org/wiki/Wave_Financial#/media/File%3AWave_logo_RGB.png",
  mpesa: "https://upload.wikimedia.org/wikipedia/commons/0/03/M-pesa-logo.png",
  telebirr: "https://upload.wikimedia.org/wikipedia/en/3/34/Telebirr_logo.png",
  vodacom: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg"
};

export const countries: Country[] = [
  // --- AFRIQUE CENTRALE ---
  {
    name: "Congo (DRC)",
    code: "CD",
    currency: "CDF",
    piToLocalRate: 2850,
    dialCode: "+243",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [
      { name: "Rawbank", bic: "RAWBCDCX", swift: "RAWBCDCX" },
      { name: "Trust Merchant Bank", bic: "TMBRCDNX", swift: "TMBRCDNX" },
      { name: "Equity BCDC", bic: "EBCDCXAA", swift: "EBCDCX" }
    ],
    operators: [
      { id: "vodacom", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Congo (Brazzaville)",
    code: "CG",
    flag: "🇨🇬",
    currency: "XAF",
    piToLocalRate: 610,
    dialCode: "+242",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "BGFIBank Congo", bic: "BGFI CG BZ", swift: "BGFICGBZ" }],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Cameroon",
    code: "CM",
    currency: "XAF",
    piToLocalRate: 610,
    dialCode: "+237",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [
      { name: "Afriland First Bank", bic: "AFIBCMCM", swift: "AFIBCMCM" },
      { name: "SCB Cameroon", bic: "SCBCCMCM", swift: "SCBCCMCM" }
    ],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Gabon",
    code: "GA",
    currency: "XAF",
    piToLocalRate: 610,
    dialCode: "+241",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "BGFIBank Gabon", bic: "BGFIGAGA", swift: "BGFIGAGA" }],
    operators: [
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- AFRIQUE DE L'OUEST ---
  {
    name: "Côte d'Ivoire",
    code: "CI",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+225",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [
      { name: "NSIA Banque", bic: "NSIACICI", swift: "NSIACI" },
      { name: "SGCI", bic: "SGCIABID", swift: "SGCI" }
    ],
    operators: [
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Sénégal",
    code: "SN",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+221",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "CBAO", bic: "CBAOSNSN", swift: "CBAOSNSN" }],
    operators: [
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "free", name: "Free Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Bénin",
    code: "BJ",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+229",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "BOA Bénin", bic: "BOABBJBB", swift: "BOABBJBB" }],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Burkina Faso",
    code: "BF",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+226",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "Coris Bank", bic: "CORIBFBF", swift: "CORIBFBF" }],
    operators: [
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Mali",
    code: "ML",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+223",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "BDM-SA", bic: "BDMAMLML", swift: "BDMAMLML" }],
    operators: [
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Togo",
    code: "TG",
    currency: "XOF",
    piToLocalRate: 615,
    dialCode: "+228",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "Ecobank Togo", bic: "ECOBTGTG", swift: "ECOBTGTG" }],
    operators: [
      { id: "tmoney", name: "T-Money", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov", name: "Moov Money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- AFRIQUE DE L'EST ---
  {
    name: "Kenya",
    code: "KE",
    currency: "KES",
    piToLocalRate: 130,
    dialCode: "+254",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "KCB Bank", bic: "KCBKKENX", swift: "KCBKKENX" }],
    operators: [
      { id: "safaricom", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },
  {
    name: "Rwanda",
    code: "RW",
    currency: "RWF",
    piToLocalRate: 1250,
    dialCode: "+250",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "Bank of Kigali", bic: "BKIGRWKK", swift: "BKIGRWKK" }],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel", name: "Airtel Money", icon: LOGOS.airtel, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- AFRIQUE AUSTRALE ---
  {
    name: "Afrique du Sud",
    code: "ZA",
    currency: "ZAR",
    piToLocalRate: 18.5,
    dialCode: "+27",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "Standard Bank", bic: "SBZA ZAJJ", swift: "SBZAZAJJ" }],
    operators: [
        { id: "mtn", name: "MTN MoMo", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } },
        { id: "vodacom", name: "Vodapay", icon: LOGOS.vodacom, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- MAGHREB ---
  {
    name: "Maroc",
    code: "MA",
    currency: "MAD",
    piToLocalRate: 10,
    dialCode: "+212",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    banks: [{ name: "Attijariwafa Bank", bic: "BCMAPMCA", swift: "BCMAPMCA" }],
    operators: [
      { id: "inwi", name: "inwi money", icon: LOGOS.moov, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange", name: "Orange Money", icon: LOGOS.orange, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- EUROPE ---
  {
    name: "France",
    code: "FR",
    currency: "EUR",
    piToLocalRate: 0.93,
    dialCode: "+33",
    continent: "EUROPE",
    isoStandard: "ISO20022",
    banks: [
      { name: "BNP Paribas", bic: "BNPAFRPP", swift: "BNPAFRPP", ibanStructure: "FR76" },
      { name: "Revolut", bic: "REVOUM22", swift: "REVOUM22", ibanStructure: "FR76" }
    ],
    operators: []
  }
];

export const getCountriesByContinent = (continent: string) =>
  countries.filter(c => c.continent === continent);
