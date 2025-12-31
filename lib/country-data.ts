// country-data.ts

export interface Bank {
  name: string;
  swift: string; 
}

export interface MobileOperator {
  id: string;
  name: string;
  icon: string; // URL du logo
}

export interface Country {
  name: string;
  code: string; 
  currency: string;
  piToLocalRate: number; 
  dialCode: string; 
  banks: Bank[];
  operators: MobileOperator[]; // Ajout des opérateurs
}

export const countries: Country[] = [
  { 
    name: "Congo (DRC)", 
    code: "CD", 
    currency: "CDF", 
    piToLocalRate: 2500, 
    dialCode: "+243", 
    banks: [
      { name: "Rawbank", swift: "RAWBCDCX" }, 
      { name: "Trust Merchant Bank", swift: "TMBRCDNX" }
    ],
    operators: [
      { id: "orange", name: "Orange Money", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" },
      { id: "vodacom", name: "M-Pesa", icon: "https://upload.wikimedia.org/wikipedia/commons/a/af/Vodafone_logo.svg" },
      { id: "airtel", name: "Airtel Money", icon: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Airtel_logo.png" }
    ]
  },
  { 
    name: "Congo (Brazzaville)", 
    code: "CG", 
    currency: "XAF", 
    piToLocalRate: 610, 
    dialCode: "+242", 
    banks: [
      { name: "BGFIBank Congo", swift: "BGFICG" }, 
      { name: "Ecobank Congo", swift: "ECOBCG" }
    ],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" },
      { id: "airtel", name: "Airtel Money", icon: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Airtel_logo.png" }
    ]
  },
  { 
    name: "Cameroon", 
    code: "CM", 
    currency: "XAF", 
    piToLocalRate: 610, 
    dialCode: "+237", 
    banks: [
      { name: "Afriland First Bank", swift: "AFIBCMCM" }, 
      { name: "Commercial Bank Cameroon", swift: "CBCCMCM" }
    ],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" },
      { id: "orange", name: "Orange Money", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" }
    ]
  },
  { 
    name: "Benin", 
    code: "BJ", 
    currency: "XOF", 
    piToLocalRate: 615, 
    dialCode: "+229", 
    banks: [
      { name: "Bank of Africa", swift: "BOABBJBB" }, 
      { name: "Ecobank Benin", swift: "ECOBBJBB" }
    ],
    operators: [
      { id: "mtn", name: "MTN MoMo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" },
      { id: "moov", name: "Moov Money", icon: "https://upload.wikimedia.org/wikipedia/fr/4/4b/Logo_Moov_Africa.png" }
    ]
  },
  { 
    name: "France", 
    code: "FR", 
    currency: "EUR", 
    piToLocalRate: 0.93, 
    dialCode: "+33", 
    banks: [
      { name: "BNP Paribas", swift: "BNPAFRPP" }, 
      { name: "Société Générale", swift: "SOGEFRPP" }
    ],
    operators: [] // Pas de Mobile Money standardisé (Type MoMo)
  },
  { 
    name: "Ivory Coast", 
    code: "CI", 
    currency: "XOF", 
    piToLocalRate: 615, 
    dialCode: "+225", 
    banks: [{ name: "NSIA Banque", swift: "NSIACI" }],
    operators: [
      { id: "orange", name: "Orange Money", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" },
      { id: "mtn", name: "MTN MoMo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" },
      { id: "wave", name: "Wave", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Wave_logo.png" }
    ]
  },
  // ... Ajoutez les autres pays ici en suivant le même modèle
];
