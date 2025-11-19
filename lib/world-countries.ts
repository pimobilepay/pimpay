export type WorldCountry = {
  code: string;
  name: string;
  dialCode: string;
  currency: string;
  mobileOperators: string[];
};

export const worldCountries: WorldCountry[] = [
  { code: "CD", name: "RDC", dialCode: "+243", currency: "CDF", mobileOperators: ["Airtel Money", "M-Pesa", "Orange Money"] },
  { code: "CM", name: "Cameroun", dialCode: "+237", currency: "XAF", mobileOperators: ["MTN MoMo", "Orange Money"] },
  { code: "CG", name: "Congo Brazzaville", dialCode: "+242", currency: "XAF", mobileOperators: ["Airtel Money", "MTN Mobile Money"] },
  { code: "GA", name: "Gabon", dialCode: "+241", currency: "XAF", mobileOperators: ["Airtel Money", "Moov Money"] },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", currency: "XOF", mobileOperators: ["Orange Money", "MTN Money", "Moov Money"] },
  { code: "SN", name: "Sénégal", dialCode: "+221", currency: "XOF", mobileOperators: ["Orange Money", "Wave", "Free Money"] },
  { code: "NG", name: "Nigeria", dialCode: "+234", currency: "NGN", mobileOperators: ["MTN MoMo", "Airtel Money", "9Mobile"] },
  { code: "KE", name: "Kenya", dialCode: "+254", currency: "KES", mobileOperators: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", name: "Tanzanie", dialCode: "+255", currency: "TZS", mobileOperators: ["Tigo Pesa", "M-Pesa", "Airtel Money"] },
  { code: "UG", name: "Ouganda", dialCode: "+256", currency: "UGX", mobileOperators: ["MTN MoMo", "Airtel Money"] },
  { code: "RW", name: "Rwanda", dialCode: "+250", currency: "RWF", mobileOperators: ["MTN MoMo", "Airtel Money"] },

  // Europe
  { code: "FR", name: "France", dialCode: "+33", currency: "EUR", mobileOperators: ["Orange", "SFR", "Bouygues", "Free"] },
  { code: "BE", name: "Belgique", dialCode: "+32", currency: "EUR", mobileOperators: ["Proximus", "Orange", "Base"] },
  { code: "IT", name: "Italie", dialCode: "+39", currency: "EUR", mobileOperators: ["Vodafone", "TIM", "Wind"] },
  { code: "ES", name: "Espagne", dialCode: "+34", currency: "EUR", mobileOperators: ["Movistar", "Orange", "Vodafone"] },
  { code: "PT", name: "Portugal", dialCode: "+351", currency: "EUR", mobileOperators: ["Nos", "Vodafone", "Meo"] },

  // Americas
  { code: "US", name: "États-Unis", dialCode: "+1", currency: "USD", mobileOperators: ["CashApp", "PayPal Mobile"] },
  { code: "CA", name: "Canada", dialCode: "+1", currency: "CAD", mobileOperators: ["Rogers", "Telus", "Bell"] },
  { code: "BR", name: "Brésil", dialCode: "+55", currency: "BRL", mobileOperators: ["Claro", "Vivo", "TIM"] },
  { code: "MX", name: "Mexique", dialCode: "+52", currency: "MXN", mobileOperators: ["Telcel", "Movistar"] },

  // Asia
  { code: "IN", name: "Inde", dialCode: "+91", currency: "INR", mobileOperators: ["Airtel Money", "JioMoney"] },
  { code: "CN", name: "Chine", dialCode: "+86", currency: "CNY", mobileOperators: ["China Mobile", "China Telecom"] },
  { code: "JP", name: "Japon", dialCode: "+81", currency: "JPY", mobileOperators: ["SoftBank", "NTT Docomo"] },
  { code: "KR", name: "Corée du Sud", dialCode: "+82", currency: "KRW", mobileOperators: ["KT", "LG U+"] },

  // Middle East
  { code: "AE", name: "Émirats Arabes Unis", dialCode: "+971", currency: "AED", mobileOperators: ["Etisalat", "Du"] },
  { code: "SA", name: "Arabie Saoudite", dialCode: "+966", currency: "SAR", mobileOperators: ["STC Pay", "Mobily"] },

  // Oceania
  { code: "AU", name: "Australie", dialCode: "+61", currency: "AUD", mobileOperators: ["Telstra", "Optus"] },
  { code: "NZ", name: "Nouvelle Zélande", dialCode: "+64", currency: "NZD", mobileOperators: ["Vodafone", "Spark"] },
]
