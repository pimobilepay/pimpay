// country-data.ts

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
  airtel: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Airtel_logo.png",
  moov: "https://upload.wikimedia.org/wikipedia/fr/4/4b/Logo_Moov_Africa.png",
  wave: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Wave_logo.png",
  mpesa: "https://upload.wikimedia.org/wikipedia/commons/a/af/Vodafone_logo.svg",
  telebirr: "https://upload.wikimedia.org/wikipedia/en/3/34/Telebirr_logo.png"
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
      { id: "wave", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } }
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
      { id: "wave", name: "Wave", icon: LOGOS.wave, features: { cashIn: true, cashOut: true, airtime: false } }
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
      { id: "safaricom", name: "M-Pesa", icon: LOGOS.mpesa, features: { cashIn: true, cashOut: true, airtime: true } }
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
      { id: "iam", name: "Itissalat Cash", icon: LOGOS.mtn, features: { cashIn: true, cashOut: true, airtime: true } }
    ]
  },

  // --- EUROPE (SEPA / ISO 20022) ---
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
    operators: [] // Pas de MoMo en France
  }
];

// Fonction utilitaire pour filtrer par continent dans tes Select
export const getCountriesByContinent = (continent: string) => 
  countries.filter(c => c.continent === continent);
