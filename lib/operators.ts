// lib/operators.ts
export const COUNTRY_OPERATORS: Record<string, {name: string, logo: string}[]> = {
  CD: [ // RDC
    { name: "Vodacom (M-Pesa)", logo: "vodacom" },
    { name: "Orange Money", logo: "orange" },
    { name: "Airtel Money", logo: "airtel" }
  ],
  CG: [ // Congo-Brazzaville
    { name: "MTN Mobile Money", logo: "mtn" },
    { name: "Airtel Money", logo: "airtel" }
  ],
  FR: [ // France
    { name: "Orange", logo: "orange" },
    { name: "SFR", logo: "sfr" },
    { name: "Bouygues", logo: "bouygues" }
  ]
};
