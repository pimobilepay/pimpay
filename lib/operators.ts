// lib/operators.ts
// Complete list of mobile money operators by country

export interface MobileOperator {
  name: string;
  logo: string;
  type: "mobile_money" | "telecom" | "bank_app";
  ussdCode?: string;
}

export const COUNTRY_OPERATORS: Record<string, MobileOperator[]> = {
  // RDC - Congo Kinshasa
  CD: [
    { name: "Vodacom M-Pesa", logo: "vodacom", type: "mobile_money", ussdCode: "*150#" },
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "*144#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*501#" },
    { name: "Africell Money", logo: "africell", type: "mobile_money" },
  ],
  // Congo Brazzaville
  CG: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*155#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*501#" },
  ],
  // Cameroun
  CM: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*126#" },
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "*150#" },
    { name: "Express Union Mobile", logo: "express_union", type: "mobile_money" },
    { name: "YUP", logo: "yup", type: "mobile_money" },
  ],
  // Nigeria
  NG: [
    { name: "MTN MoMo", logo: "mtn", type: "mobile_money", ussdCode: "*223#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money" },
    { name: "9mobile Money", logo: "9mobile", type: "mobile_money" },
    { name: "Glo Mobile Money", logo: "glo", type: "mobile_money" },
    { name: "Paga", logo: "paga", type: "mobile_money" },
    { name: "OPay", logo: "opay", type: "mobile_money" },
    { name: "Kuda", logo: "kuda", type: "bank_app" },
    { name: "Palmpay", logo: "palmpay", type: "mobile_money" },
  ],
  // Ghana
  GH: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*170#" },
    { name: "Vodafone Cash", logo: "vodafone", type: "mobile_money", ussdCode: "*110#" },
    { name: "AirtelTigo Money", logo: "airtel", type: "mobile_money", ussdCode: "*500#" },
    { name: "G-Money", logo: "gmoney", type: "mobile_money" },
    { name: "Zeepay", logo: "zeepay", type: "mobile_money" },
  ],
  // Senegal
  SN: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "#144#" },
    { name: "Wave", logo: "wave", type: "mobile_money" },
    { name: "Free Money", logo: "free", type: "mobile_money", ussdCode: "#555#" },
    { name: "E-Money", logo: "emoney", type: "mobile_money" },
  ],
  // Cote d'Ivoire
  CI: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "#144#" },
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*133#" },
    { name: "Wave", logo: "wave", type: "mobile_money" },
    { name: "Moov Money", logo: "moov", type: "mobile_money", ussdCode: "*155#" },
  ],
  // Mali
  ML: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "#144#" },
    { name: "Moov Money", logo: "moov", type: "mobile_money" },
    { name: "Sama Money", logo: "sama", type: "mobile_money" },
  ],
  // Burkina Faso
  BF: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "#144#" },
    { name: "Moov Money", logo: "moov", type: "mobile_money", ussdCode: "*555#" },
    { name: "Coris Money", logo: "coris", type: "mobile_money" },
  ],
  // Benin
  BJ: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*880#" },
    { name: "Moov Money", logo: "moov", type: "mobile_money", ussdCode: "*155#" },
    { name: "Celtiis Money", logo: "celtiis", type: "mobile_money" },
  ],
  // Togo
  TG: [
    { name: "Flooz", logo: "moov", type: "mobile_money", ussdCode: "*145#" },
    { name: "T-Money", logo: "togocel", type: "mobile_money", ussdCode: "*150#" },
  ],
  // Niger
  NE: [
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*401#" },
    { name: "Orange Money", logo: "orange", type: "mobile_money" },
    { name: "Moov Money", logo: "moov", type: "mobile_money" },
  ],
  // Guinea
  GN: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "*144#" },
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money" },
    { name: "Areeba Money", logo: "areeba", type: "mobile_money" },
  ],
  // Gabon
  GA: [
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*126#" },
    { name: "Moov Money", logo: "moov", type: "mobile_money" },
  ],
  // Kenya
  KE: [
    { name: "M-Pesa", logo: "mpesa", type: "mobile_money", ussdCode: "*334#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*334#" },
    { name: "T-Kash", logo: "telkom", type: "mobile_money" },
    { name: "Equitel", logo: "equity", type: "mobile_money" },
  ],
  // Tanzania
  TZ: [
    { name: "M-Pesa", logo: "mpesa", type: "mobile_money", ussdCode: "*150*00#" },
    { name: "Tigo Pesa", logo: "tigo", type: "mobile_money", ussdCode: "*150*01#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*150*60#" },
    { name: "Halotel Halopesa", logo: "halotel", type: "mobile_money" },
  ],
  // Uganda
  UG: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*165#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money", ussdCode: "*185#" },
    { name: "M-Sente", logo: "utl", type: "mobile_money" },
  ],
  // Rwanda
  RW: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money", ussdCode: "*182#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money" },
    { name: "Tigo Cash", logo: "tigo", type: "mobile_money" },
  ],
  // Ethiopia
  ET: [
    { name: "Telebirr", logo: "telebirr", type: "mobile_money", ussdCode: "*127#" },
    { name: "CBE Birr", logo: "cbe", type: "mobile_money" },
    { name: "M-Birr", logo: "mbirr", type: "mobile_money" },
  ],
  // South Africa
  ZA: [
    { name: "Vodacom", logo: "vodacom", type: "telecom" },
    { name: "MTN", logo: "mtn", type: "telecom" },
    { name: "Cell C", logo: "cellc", type: "telecom" },
    { name: "Telkom", logo: "telkom", type: "telecom" },
    { name: "FNB eWallet", logo: "fnb", type: "mobile_money" },
    { name: "Standard Bank Instant Money", logo: "standardbank", type: "mobile_money" },
  ],
  // Angola
  AO: [
    { name: "Unitel Money", logo: "unitel", type: "mobile_money" },
    { name: "Movicel Money", logo: "movicel", type: "mobile_money" },
    { name: "Multicaixa Express", logo: "multicaixa", type: "mobile_money" },
  ],
  // Madagascar
  MG: [
    { name: "Orange Money", logo: "orange", type: "mobile_money", ussdCode: "#144#" },
    { name: "MVola", logo: "telma", type: "mobile_money", ussdCode: "*111#" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money" },
  ],
  // Zambia
  ZM: [
    { name: "MTN Mobile Money", logo: "mtn", type: "mobile_money" },
    { name: "Airtel Money", logo: "airtel", type: "mobile_money" },
    { name: "Zamtel Kwacha", logo: "zamtel", type: "mobile_money" },
    { name: "Zoona", logo: "zoona", type: "mobile_money" },
  ],
  // Mozambique
  MZ: [
    { name: "M-Pesa", logo: "mpesa", type: "mobile_money" },
    { name: "E-Mola", logo: "movitel", type: "mobile_money" },
    { name: "mKesh", logo: "mkesh", type: "mobile_money" },
  ],
  // Morocco
  MA: [
    { name: "Inwi Money", logo: "inwi", type: "mobile_money" },
    { name: "Orange Money", logo: "orange", type: "mobile_money" },
    { name: "Maroc Telecom", logo: "maroctelecom", type: "telecom" },
  ],
  // Egypt
  EG: [
    { name: "Vodafone Cash", logo: "vodafone", type: "mobile_money" },
    { name: "Etisalat Cash", logo: "etisalat", type: "mobile_money" },
    { name: "Orange Cash", logo: "orange", type: "mobile_money" },
    { name: "WE Pay", logo: "we", type: "mobile_money" },
    { name: "Fawry", logo: "fawry", type: "mobile_money" },
  ],
  // Tunisia
  TN: [
    { name: "Ooredoo", logo: "ooredoo", type: "telecom" },
    { name: "Orange Tunisie", logo: "orange", type: "telecom" },
    { name: "Tunisie Telecom", logo: "tunisietelecom", type: "telecom" },
    { name: "D17", logo: "d17", type: "mobile_money" },
  ],
  // Chad
  TD: [
    { name: "Airtel Money", logo: "airtel", type: "mobile_money" },
    { name: "Tigo Cash", logo: "tigo", type: "mobile_money" },
  ],
  // France
  FR: [
    { name: "Orange", logo: "orange", type: "telecom" },
    { name: "SFR", logo: "sfr", type: "telecom" },
    { name: "Bouygues Telecom", logo: "bouygues", type: "telecom" },
    { name: "Free Mobile", logo: "free", type: "telecom" },
  ],
  // USA
  US: [
    { name: "Venmo", logo: "venmo", type: "mobile_money" },
    { name: "Cash App", logo: "cashapp", type: "mobile_money" },
    { name: "Zelle", logo: "zelle", type: "mobile_money" },
    { name: "PayPal", logo: "paypal", type: "mobile_money" },
  ],
  // UK
  GB: [
    { name: "PayPal", logo: "paypal", type: "mobile_money" },
    { name: "Monzo", logo: "monzo", type: "bank_app" },
    { name: "Revolut", logo: "revolut", type: "bank_app" },
  ],
  // India
  IN: [
    { name: "Paytm", logo: "paytm", type: "mobile_money" },
    { name: "PhonePe", logo: "phonepe", type: "mobile_money" },
    { name: "Google Pay", logo: "gpay", type: "mobile_money" },
    { name: "BHIM UPI", logo: "bhim", type: "mobile_money" },
    { name: "Jio", logo: "jio", type: "telecom" },
    { name: "Airtel", logo: "airtel", type: "telecom" },
    { name: "Vi", logo: "vi", type: "telecom" },
  ],
  // Pakistan
  PK: [
    { name: "JazzCash", logo: "jazz", type: "mobile_money" },
    { name: "Easypaisa", logo: "easypaisa", type: "mobile_money" },
    { name: "UBL Omni", logo: "ubl", type: "mobile_money" },
  ],
  // Bangladesh
  BD: [
    { name: "bKash", logo: "bkash", type: "mobile_money" },
    { name: "Nagad", logo: "nagad", type: "mobile_money" },
    { name: "Rocket", logo: "rocket", type: "mobile_money" },
    { name: "Upay", logo: "upay", type: "mobile_money" },
  ],
  // Philippines
  PH: [
    { name: "GCash", logo: "gcash", type: "mobile_money" },
    { name: "Maya", logo: "maya", type: "mobile_money" },
    { name: "Coins.ph", logo: "coins", type: "mobile_money" },
    { name: "Globe", logo: "globe", type: "telecom" },
    { name: "Smart", logo: "smart", type: "telecom" },
  ],
  // Indonesia
  ID: [
    { name: "GoPay", logo: "gopay", type: "mobile_money" },
    { name: "OVO", logo: "ovo", type: "mobile_money" },
    { name: "DANA", logo: "dana", type: "mobile_money" },
    { name: "ShopeePay", logo: "shopeepay", type: "mobile_money" },
    { name: "LinkAja", logo: "linkaja", type: "mobile_money" },
  ],
  // Vietnam
  VN: [
    { name: "MoMo", logo: "momo", type: "mobile_money" },
    { name: "ZaloPay", logo: "zalopay", type: "mobile_money" },
    { name: "VNPay", logo: "vnpay", type: "mobile_money" },
    { name: "Viettel Money", logo: "viettel", type: "mobile_money" },
  ],
  // Thailand
  TH: [
    { name: "TrueMoney Wallet", logo: "truemoney", type: "mobile_money" },
    { name: "PromptPay", logo: "promptpay", type: "mobile_money" },
    { name: "Rabbit LINE Pay", logo: "linepay", type: "mobile_money" },
  ],
  // Malaysia
  MY: [
    { name: "Touch 'n Go eWallet", logo: "touchngo", type: "mobile_money" },
    { name: "GrabPay", logo: "grabpay", type: "mobile_money" },
    { name: "Boost", logo: "boost", type: "mobile_money" },
  ],
  // Brazil
  BR: [
    { name: "PIX", logo: "pix", type: "mobile_money" },
    { name: "PicPay", logo: "picpay", type: "mobile_money" },
    { name: "Mercado Pago", logo: "mercadopago", type: "mobile_money" },
    { name: "Nubank", logo: "nubank", type: "bank_app" },
  ],
  // Mexico
  MX: [
    { name: "Mercado Pago", logo: "mercadopago", type: "mobile_money" },
    { name: "BBVA", logo: "bbva", type: "bank_app" },
    { name: "Telcel", logo: "telcel", type: "telecom" },
  ],
  // Haiti
  HT: [
    { name: "MonCash", logo: "moncash", type: "mobile_money" },
    { name: "Lajan Cash", logo: "lajancash", type: "mobile_money" },
    { name: "Natcom", logo: "natcom", type: "telecom" },
    { name: "Digicel", logo: "digicel", type: "telecom" },
  ],
  // Dominican Republic
  DO: [
    { name: "tPago", logo: "tpago", type: "mobile_money" },
    { name: "Claro", logo: "claro", type: "telecom" },
    { name: "Altice", logo: "altice", type: "telecom" },
  ],
  // Jamaica
  JM: [
    { name: "NCB Quisk", logo: "ncb", type: "mobile_money" },
    { name: "Digicel", logo: "digicel", type: "telecom" },
    { name: "Flow", logo: "flow", type: "telecom" },
  ],
};

// Helper functions
export function getOperatorsByCountry(countryCode: string): MobileOperator[] {
  return COUNTRY_OPERATORS[countryCode.toUpperCase()] || [];
}

export function getMobileMoneyOperators(countryCode: string): MobileOperator[] {
  return getOperatorsByCountry(countryCode).filter(op => op.type === "mobile_money");
}

export function getTelecomOperators(countryCode: string): MobileOperator[] {
  return getOperatorsByCountry(countryCode).filter(op => op.type === "telecom");
}

export function getAllSupportedCountries(): string[] {
  return Object.keys(COUNTRY_OPERATORS);
}
