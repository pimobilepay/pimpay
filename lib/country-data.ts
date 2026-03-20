// lib/country-data.ts

export interface Bank {
  name: string;
  bic: string;
  swift: string;
  ibanStructure?: string;
  logo?: string;
}

export interface MobileOperator {
  id: string;
  name: string;
  icon: string; // full URL
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
  piToLocalRate: number;
  dialCode: string;
  continent: "AFRICA" | "EUROPE" | "AMERICA" | "ASIA" | "OCEANIA";
  banks: Bank[];
  operators: MobileOperator[];
  isoStandard: "ISO20022";
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Operator logo URLs
// ---------------------------------------------------------------------------
const OP: Record<string, string> = {
  orange:       "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg",
  mtn:          "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg",
  airtel:       "https://upload.wikimedia.org/wikipedia/commons/3/3a/Airtel_logo-01.png",
  moov:         "https://upload.wikimedia.org/wikipedia/fr/1/1d/Moov_Africa_logo.png",
  wave:         "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Wave_Logo_RGB.png/512px-Wave_Logo_RGB.png",
  mpesa:        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/200px-M-PESA_LOGO-01.svg.png",
  telebirr:     "https://upload.wikimedia.org/wikipedia/en/3/34/Telebirr_logo.png",
  vodacom:      "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
  vodafone:     "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
  africell:     "https://upload.wikimedia.org/wikipedia/commons/9/99/Logoafricell.png",
  free:         "https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/Free_logo.svg/200px-Free_logo.svg.png",
  tigo:         "https://upload.wikimedia.org/wikipedia/commons/4/47/Tigo.JPG",
  opay:         "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/OPay_logo.svg/200px-OPay_logo.svg.png",
  palmpay:      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/PalmPay_logo.svg/200px-PalmPay_logo.svg.png",
  kuda:         "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Kuda_Bank_logo.svg/200px-Kuda_Bank_logo.svg.png",
  paga:         "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Paga_logo.png/200px-Paga_logo.png",
  glo:          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Glo_logo.svg/200px-Glo_logo.svg.png",
  "9mobile":    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/9mobile_logo.png/200px-9mobile_logo.png",
  gmoney:       "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/G-Money_logo.png/200px-G-Money_logo.png",
  zeepay:       "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Zeepay_logo.png/200px-Zeepay_logo.png",
  emoney:       "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/E-money_logo.png/200px-E-money_logo.png",
  coris:        "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Coris_Bank_International_logo.svg/200px-Coris_Bank_International_logo.svg.png",
  sama:         "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sama_money_logo.png/200px-Sama_money_logo.png",
  celtiis:      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Celtiis_logo.png/200px-Celtiis_logo.png",
  togocel:      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Togocel_logo.svg/200px-Togocel_logo.svg.png",
  areeba:       "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Areeba_logo.png/200px-Areeba_logo.png",
  express_union:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Express_Union_Logo.png/200px-Express_Union_Logo.png",
  yup:          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/YUP_logo.png/200px-YUP_logo.png",
  unitel:       "https://fr.wikipedia.org/wiki/Unitel#/media/Fichier%3AUnitel_Logo_2005.svg",
  movicel:      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Movicel_logo.svg/200px-Movicel_logo.svg.png",
  multicaixa:   "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Multicaixa_logo.png/200px-Multicaixa_logo.png",
  telma:        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Telma_Mobile_logo.svg/200px-Telma_Mobile_logo.svg.png",
  revolut:      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Revolut_logo.svg/200px-Revolut_logo.svg.png",
  inwi:         "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Inwi_logo.svg/200px-Inwi_logo.svg.png",
  maroctelecom: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Maroc_Telecom_logo.svg/200px-Maroc_Telecom_logo.svg.png",
};

// ---------------------------------------------------------------------------
// Bank logo URLs
// ---------------------------------------------------------------------------
const BK: Record<string, string> = {
  // Global / Pan-African
  ecobank:          "https://www.expandgh.com/wp-content/uploads/2017/08/ecobank-mobiles.png",
  uba:              "https://ynaija.com/wp-content/uploads/2023/09/IMG_7021-512x500.png",
  societe_generale: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Soci%C3%A9t%C3%A9_G%C3%A9n%C3%A9rale.svg/200px-Soci%C3%A9t%C3%A9_G%C3%A9n%C3%A9rale.svg.png",
  bnp:              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/BNP_Paribas.svg/200px-BNP_Paribas.svg.png",
  // West Africa
  zenith:           "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Zenith-Bank-logo.png/200px-Zenith-Bank-logo.png",
  access:           "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Access-bank-diamond.png/200px-Access-bank-diamond.png",
  gtbank:           "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Guaranty_Trust_Bank_logo.svg/200px-Guaranty_Trust_Bank_logo.svg.png",
  firstbank:        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/First_Bank_of_Nigeria_logo.svg/200px-First_Bank_of_Nigeria_logo.svg.png",
  stanbic:          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Stanbic_IBTC_Bank_logo.svg/200px-Stanbic_IBTC_Bank_logo.svg.png",
  gcb:              "https://upload.wikimedia.org/wikipedia/en/thumb/9/9d/GCB_Bank_logo.svg/200px-GCB_Bank_logo.svg.png",
  absa:             "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Absa_Group_logo.svg/200px-Absa_Group_logo.svg.png",
  cbao:             "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/CBAO_logo.png/200px-CBAO_logo.png",
  bici:             "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bicici-logo.png/200px-Bicici-logo.png",
  coris_bank:       "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Coris_Bank_International_logo.svg/200px-Coris_Bank_International_logo.svg.png",
  nsia:             "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/NSIA_Banque_logo.png/200px-NSIA_Banque_logo.png",
  boc:              "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/BOC_CI_logo.png/200px-BOC_CI_logo.png",
  // Central Africa
  bgfi:             "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/BGFIBank_Logo.svg/200px-BGFIBank_Logo.svg.png",
  rawbank:          "https://upload.wikimedia.org/wikipedia/fr/6/66/Rawbank_logo.png",
  tmb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/TMB_logo.svg/200px-TMB_logo.svg.png",
  equity:           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Equity_Bank_logo.svg/200px-Equity_Bank_logo.svg.png",
  afriland:         "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Logo_Afriland_First_Bank.svg/200px-Logo_Afriland_First_Bank.svg.png",
  lcb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/LCB_Bank_logo.png/200px-LCB_Bank_logo.png",
  lubi:             "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Lubi_Finance_logo.png/200px-Lubi_Finance_logo.png",
  // East Africa
  kcb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/KCB_Group_Logo.svg/200px-KCB_Group_Logo.svg.png",
  dtb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Diamond_Trust_Bank_logo.png/200px-Diamond_Trust_Bank_logo.png",
  nmb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/NMB_Bank_logo.png/200px-NMB_Bank_logo.png",
  crdb:             "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/CRDB_Bank_logo.png/200px-CRDB_Bank_logo.png",
  dfcu:             "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/DFCU_Bank_logo.png/200px-DFCU_Bank_logo.png",
  bk:               "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bank_of_Kigali_logo.svg/200px-Bank_of_Kigali_logo.svg.png",
  cbe:              "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Commercial_Bank_of_Ethiopia_logo.svg/200px-Commercial_Bank_of_Ethiopia_logo.svg.png",
  // Southern Africa
  fnb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/FNB_logo.svg/200px-FNB_logo.svg.png",
  standardbank:     "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Standard_Bank_logo.svg/200px-Standard_Bank_logo.svg.png",
  nedbank:          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Nedbank_logo.svg/200px-Nedbank_logo.svg.png",
  bai:              "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Banco_BAI_logo.png/200px-Banco_BAI_logo.png",
  bfa:              "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/BFA_Angola_logo.png/200px-BFA_Angola_logo.png",
  boa:              "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/BOA_logo.png/200px-BOA_logo.png",
  // North Africa
  bmce:             "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/BMCE_Bank_logo.svg/200px-BMCE_Bank_logo.svg.png",
  attijariwafa:     "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Attijariwafa_bank_logo.svg/200px-Attijariwafa_bank_logo.svg.png",
  cib_eg:           "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/CIB_Egypt_logo.svg/200px-CIB_Egypt_logo.svg.png",
  nbe:              "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/National_Bank_of_Egypt_logo.svg/200px-National_Bank_of_Egypt_logo.svg.png",
  biat:             "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/BIAT_logo.png/200px-BIAT_logo.png",
  stb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/STB_bank_logo.png/200px-STB_bank_logo.png",
  // Europe
  bnp_fr:           "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/BNP_Paribas.svg/200px-BNP_Paribas.svg.png",
  credit_agricole:  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Cr%C3%A9dit_Agricole.svg/200px-Cr%C3%A9dit_Agricole.svg.png",
  hsbc:             "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/200px-HSBC_logo_%282018%29.svg.png",
  barclays:         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Barclays_logo.svg/200px-Barclays_logo.svg.png",
  revolut_bank:     "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Revolut_logo.svg/200px-Revolut_logo.svg.png",
  // Americas
  chase:            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/J.P._Morgan_Logo_2008_1.svg/200px-J.P._Morgan_Logo_2008_1.svg.png",
  bofa:             "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/BankofAmerica.svg/200px-BankofAmerica.svg.png",
  wells_fargo:      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Wells_Fargo_Bank.svg/200px-Wells_Fargo_Bank.svg.png",
  banco_brasil:     "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Banco_do_Brasil_logo_2023.svg/200px-Banco_do_Brasil_logo_2023.svg.png",
  bradesco:         "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Bradesco_logo.svg/200px-Bradesco_logo.svg.png",
  itau:             "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Itau_Unibanco_logo.svg/200px-Itau_Unibanco_logo.svg.png",
  // Asia
  icbc:             "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/ICBC_logo.svg/200px-ICBC_logo.svg.png",
  boc_cn:           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Bank_of_China_logo.svg/200px-Bank_of_China_logo.svg.png",
  sbi:              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SBI-logo.svg/200px-SBI-logo.svg.png",
  hdfc:             "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/200px-HDFC_Bank_Logo.svg.png",
  icici:            "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/ICICI_Bank_Logo.svg/200px-ICICI_Bank_Logo.svg.png",
  bri:              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/BANK_BRI_logo.svg/200px-BANK_BRI_logo.svg.png",
  bca:              "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/200px-Bank_Central_Asia.svg.png",
  mandiri:          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2008.svg/200px-Bank_Mandiri_logo_2008.svg.png",
  vietcombank:      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Vietcombank_logo.svg/200px-Vietcombank_logo.svg.png",
  scb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Siam_Commercial_Bank_logo_%28new%29.svg/200px-Siam_Commercial_Bank_logo_%28new%29.svg.png",
  kbank:            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/KBank_logo.svg/200px-KBank_logo.svg.png",
  maybank:          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Maybank_logo.svg/200px-Maybank_logo.svg.png",
  cimb:             "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/CIMB_logo.svg/200px-CIMB_logo.svg.png",
  dbs:              "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/DBS_Bank_logo.svg/200px-DBS_Bank_logo.svg.png",
  fab:              "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/First_Abu_Dhabi_Bank_logo.svg/200px-First_Abu_Dhabi_Bank_logo.svg.png",
  adcb:             "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/ADCB_logo.svg/200px-ADCB_logo.svg.png",
  al_rajhi:         "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Al_Rajhi_Bank_logo.svg/200px-Al_Rajhi_Bank_logo.svg.png",
  snb:              "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Saudi_National_Bank_logo.svg/200px-Saudi_National_Bank_logo.svg.png",
};

// ---------------------------------------------------------------------------
// Core countries (active)
// ---------------------------------------------------------------------------
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
      { name: "Zenith Bank",              bic: "ZENINLAA", swift: "ZENINLAA", logo: BK.zenith },
      { name: "Access Bank",              bic: "ACCENGLA", swift: "ACCENGLA", logo: BK.access },
      { name: "Guaranty Trust Bank",      bic: "GTBINGLA", swift: "GTBINGLA", logo: BK.gtbank },
      { name: "First Bank of Nigeria",    bic: "FBNINGLA", swift: "FBNINGLA", logo: BK.firstbank },
      { name: "United Bank for Africa",   bic: "UNAFNGLA", swift: "UNAFNGLA", logo: BK.uba },
      { name: "Stanbic IBTC Bank",        bic: "SBICNGLA", swift: "SBICNGLA", logo: BK.stanbic },
      { name: "Ecobank Nigeria",          bic: "ECOCNGLA", swift: "ECOCNGLA", logo: BK.ecobank },
    ],
    operators: [
      { id: "mtn_ng",    name: "MTN MoMo",     icon: OP.mtn,      features: { cashIn: true,  cashOut: true,  airtime: true } },
      { id: "airtel_ng", name: "Airtel Money",  icon: OP.airtel,   features: { cashIn: true,  cashOut: true,  airtime: true } },
      { id: "opay_ng",   name: "OPay",          icon: OP.opay,     features: { cashIn: true,  cashOut: true,  airtime: true } },
      { id: "palmpay_ng",name: "PalmPay",       icon: OP.palmpay,  features: { cashIn: true,  cashOut: true,  airtime: true } },
      { id: "paga_ng",   name: "Paga",          icon: OP.paga,     features: { cashIn: true,  cashOut: true,  airtime: false } },
      { id: "kuda_ng",   name: "Kuda",          icon: OP.kuda,     features: { cashIn: true,  cashOut: true,  airtime: false } },
      { id: "glo_ng",    name: "Glo Mobile Money",icon: OP.glo,   features: { cashIn: true,  cashOut: false, airtime: true } },
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
      { name: "GCB Bank",          bic: "GHCBGHAC", swift: "GHCBGHAC", logo: BK.gcb },
      { name: "Ecobank Ghana",     bic: "ECOCGHAC", swift: "ECOCGHAC", logo: BK.ecobank },
      { name: "Absa Bank Ghana",   bic: "BARCGHAC", swift: "BARCGHAC", logo: BK.absa },
      { name: "Stanbic Bank Ghana",bic: "SBICGHAC", swift: "SBICGHAC", logo: BK.stanbic },
      { name: "UBA Ghana",         bic: "UNAFGHAC", swift: "UNAFGHAC", logo: BK.uba },
    ],
    operators: [
      { id: "mtn_gh",     name: "MTN Mobile Money",  icon: OP.mtn,      features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "vodafone_gh",name: "Vodafone Cash",     icon: OP.vodafone, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_gh",  name: "AirtelTigo Money",  icon: OP.airtel,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "gmoney_gh",  name: "G-Money",           icon: OP.gmoney,   features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "zeepay_gh",  name: "Zeepay",            icon: OP.zeepay,   features: { cashIn: true, cashOut: true, airtime: false } },
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
      { name: "Ecobank Guinea",   bic: "ECOCGNGN", swift: "ECOCGNGN", logo: BK.ecobank },
      { name: "UBA Guinea",       bic: "UNAFGNGN", swift: "UNAFGNGN", logo: BK.uba },
      { name: "BOA Guinea",       bic: "BOAFGNGN", swift: "BOAFGNGN", logo: BK.boa },
    ],
    operators: [
      { id: "orange_gn", name: "Orange Money",     icon: OP.orange,  features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "mtn_gn",    name: "MTN Mobile Money", icon: OP.mtn,     features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "areeba_gn", name: "Areeba Money",     icon: OP.areeba,  features: { cashIn: true, cashOut: true, airtime: true } },
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
      { name: "BGFIBank Gabon",           bic: "BGFIGAGX", swift: "BGFIGAGX", logo: BK.bgfi },
      { name: "UGB (Union Gabonaise de Banque)", bic: "UGBGGAGX", swift: "UGBGGAGX" },
      { name: "Ecobank Gabon",            bic: "ECOCGAGX", swift: "ECOCGAGX", logo: BK.ecobank },
      { name: "UBA Gabon",                bic: "UNAFGAGX", swift: "UNAFGAGX", logo: BK.uba },
    ],
    operators: [
      { id: "airtel_ga", name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_ga",   name: "Moov Money",   icon: OP.moov,   features: { cashIn: true, cashOut: true, airtime: true } },
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
      { name: "Banco Angolano de Investimentos (BAI)", bic: "BAIPAOLU", swift: "BAIPAOLU", logo: BK.bai },
      { name: "Banco de Fomento Angola (BFA)",         bic: "BFAPAOLU", swift: "BFAPAOLU", logo: BK.bfa },
      { name: "Ecobank Angola",                        bic: "ECOCAOLU", swift: "ECOCAOLU", logo: BK.ecobank },
      { name: "Standard Bank Angola",                  bic: "SBICAOLU", swift: "SBICAOLU", logo: BK.standardbank },
    ],
    operators: [
      { id: "unitel_ao",    name: "Unitel Money",       icon: OP.unitel,     features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "movicel_ao",   name: "Movicel Money",      icon: OP.movicel,    features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "multicaixa_ao",name: "Multicaixa Express", icon: OP.multicaixa, features: { cashIn: true, cashOut: true, airtime: false } },
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
      { name: "Afriland First Bank",    bic: "AFBKCMCX", swift: "AFBKCMCX", logo: BK.afriland },
      { name: "Société Générale CM",    bic: "SGCCMCXX", swift: "SGCCMCXX", logo: BK.societe_generale },
      { name: "Ecobank Cameroun",       bic: "ECOCCMCX", swift: "ECOCCMCX", logo: BK.ecobank },
      { name: "UBA Cameroun",           bic: "UNAFCMCX", swift: "UNAFCMCX", logo: BK.uba },
      { name: "BGFIBank Cameroun",      bic: "BGFICMCX", swift: "BGFICMCX", logo: BK.bgfi },
    ],
    operators: [
      { id: "mtn_cm",           name: "MTN MoMo",            icon: OP.mtn,           features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange_cm",        name: "Orange Money",         icon: OP.orange,        features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "express_union_cm", name: "Express Union Mobile", icon: OP.express_union, features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "yup_cm",           name: "YUP",                  icon: OP.yup,           features: { cashIn: true, cashOut: true, airtime: false } },
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
    banks: [
      { name: "BDM-SA",              bic: "BDMSAMLBA", swift: "BDMSAMLBA" },
      { name: "Ecobank Mali",        bic: "ECOCMLBA",  swift: "ECOCMLBA",  logo: BK.ecobank },
      { name: "BOA Mali",            bic: "BOAFMLBA",  swift: "BOAFMLBA",  logo: BK.boa },
      { name: "UBA Mali",            bic: "UNAFMLBA",  swift: "UNAFMLBA",  logo: BK.uba },
    ],
    operators: [
      { id: "orange_ml", name: "Orange Money", icon: OP.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_ml",   name: "Moov Money",   icon: OP.moov,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "sama_ml",   name: "Sama Money",   icon: OP.sama,   features: { cashIn: true, cashOut: true, airtime: false } },
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
    banks: [
      { name: "Coris Bank International", bic: "CORISBFBX", swift: "CORISBFBX", logo: BK.coris_bank },
      { name: "Ecobank Burkina",          bic: "ECOCBFBX",  swift: "ECOCBFBX",  logo: BK.ecobank },
      { name: "BOA Burkina Faso",         bic: "BOAFBFBX",  swift: "BOAFBFBX",  logo: BK.boa },
      { name: "Société Générale BF",      bic: "SGCIBFBX",  swift: "SGCIBFBX",  logo: BK.societe_generale },
      { name: "UBA Burkina Faso",         bic: "UNAFBFBX",  swift: "UNAFBFBX",  logo: BK.uba },
    ],
    operators: [
      { id: "orange_bf", name: "Orange Money", icon: OP.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_bf",   name: "Moov Money",   icon: OP.moov,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "coris_bf",  name: "Coris Money",  icon: OP.coris,  features: { cashIn: true, cashOut: true, airtime: false } },
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
    banks: [
      { name: "Ecobank Bénin",                    bic: "ECOCBJBJ", swift: "ECOCBJBJ", logo: BK.ecobank },
      { name: "BOA Bénin",                        bic: "BOAFBJBJ", swift: "BOAFBJBJ", logo: BK.boa },
      { name: "BICI-B (BNP Paribas)",             bic: "BNPABJBJ", swift: "BNPABJBJ", logo: BK.bnp },
      { name: "UBA Bénin",                        bic: "UNAFBJBJ", swift: "UNAFBJBJ", logo: BK.uba },
    ],
    operators: [
      { id: "mtn_bj",    name: "MTN MoMo",    icon: OP.mtn,     features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "moov_bj",   name: "Moov Money",  icon: OP.moov,    features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "celtiis_bj",name: "Celtiis Money",icon: OP.celtiis, features: { cashIn: true, cashOut: true, airtime: true } },
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
      { name: "BGFIBank Congo",  bic: "BGFICGBZ", swift: "BGFICGBZ", logo: BK.bgfi },
      { name: "LCB Bank",        bic: "LCBCCGBZ", swift: "LCBCCGBZ", logo: BK.lcb },
      { name: "Ecobank Congo",   bic: "ECOCCGBZ", swift: "ECOCCGBZ", logo: BK.ecobank },
      { name: "Société Générale Congo", bic: "SGCICGBZ", swift: "SGCICGBZ", logo: BK.societe_generale },
    ],
    operators: [
      { id: "mtn_cg",    name: "MTN MoMo",    icon: OP.mtn,    features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_cg", name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ],
  },
  {
    name: "Congo (DRC)",
    code: "CD",
    flag: "🇨🇩",
    currency: "CDF",
    currencySymbol: "FC",
    piToLocalRate: 2800,
    dialCode: "+243",
    continent: "AFRICA",
    isoStandard: "ISO20022",
    isActive: true,
    banks: [
      { name: "Rawbank",        bic: "RAWBCDCX", swift: "RAWBCDCX", logo: BK.rawbank },
      { name: "Trust Merchant Bank (TMB)", bic: "TMBRCDCX", swift: "TMBRCDCX", logo: BK.tmb },
      { name: "Equity BCDC",    bic: "EBCDCDCX", swift: "EBCDCDCX", logo: BK.equity },
      { name: "Ecobank RDC",    bic: "ECOCCDCX", swift: "ECOCCDCX", logo: BK.ecobank },
      { name: "UBA Congo DRC",  bic: "UNAFCDCX", swift: "UNAFCDCX", logo: BK.uba },
      { name: "Lubi Finance",   bic: "LUBFCDCX", swift: "LUBFCDCX", logo: BK.lubi },
    ],
    operators: [
      { id: "vodacom_cd",  name: "M-Pesa",         icon: OP.mpesa,    features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange_cd",   name: "Orange Money",   icon: OP.orange,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_cd",   name: "Airtel Money",   icon: OP.airtel,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "africell_cd", name: "Africell Money", icon: OP.africell, features: { cashIn: true, cashOut: true, airtime: true } },
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
    banks: [
      { name: "NSIA Banque",         bic: "NSIACIBJ", swift: "NSIACIBJ", logo: BK.nsia },
      { name: "Ecobank CI",          bic: "ECOCCIBI", swift: "ECOCCIBI", logo: BK.ecobank },
      { name: "BOC CI",              bic: "BOCCCIBI", swift: "BOCCCIBI", logo: BK.boc },
      { name: "BICI (BNP Paribas)",  bic: "BICIBIBI", swift: "BICIBIBI", logo: BK.bici },
      { name: "Société Générale CI", bic: "SGCIBIBI", swift: "SGCIBIBI", logo: BK.societe_generale },
      { name: "UBA Côte d'Ivoire",   bic: "UNAFCIBI", swift: "UNAFCIBI", logo: BK.uba },
    ],
    operators: [
      { id: "orange_ci", name: "Orange Money",     icon: OP.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "mtn_ci",    name: "MTN Mobile Money", icon: OP.mtn,    features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave_ci",   name: "Wave",             icon: OP.wave,   features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "moov_ci",   name: "Moov Money",       icon: OP.moov,   features: { cashIn: true, cashOut: true, airtime: true } },
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
    banks: [
      { name: "CBAO Groupe Attijariwafa", bic: "CBAOSNDR", swift: "CBAOSNDR", logo: BK.attijariwafa },
      { name: "Ecobank Sénégal",          bic: "ECOCSNDX", swift: "ECOCSNDX", logo: BK.ecobank },
      { name: "BOA Sénégal",              bic: "BOAFSNDX", swift: "BOAFSNDX", logo: BK.boa },
      { name: "Société Générale SN",      bic: "SGSNSNDA", swift: "SGSNSNDA", logo: BK.societe_generale },
      { name: "UBA Sénégal",              bic: "UNAFSNDX", swift: "UNAFSNDX", logo: BK.uba },
    ],
    operators: [
      { id: "orange_sn", name: "Orange Money", icon: OP.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "wave_sn",   name: "Wave",         icon: OP.wave,   features: { cashIn: true, cashOut: true, airtime: false } },
      { id: "free_sn",   name: "Free Money",   icon: OP.free,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "emoney_sn", name: "E-Money",      icon: OP.emoney, features: { cashIn: true, cashOut: true, airtime: false } },
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
    banks: [
      { name: "KCB Bank",         bic: "KCBKKENX", swift: "KCBKKENX", logo: BK.kcb },
      { name: "Equity Bank Kenya",bic: "EQBLKENX", swift: "EQBLKENX", logo: BK.equity },
      { name: "DTB Kenya",        bic: "DTBKKENX", swift: "DTBKKENX", logo: BK.dtb },
      { name: "Ecobank Kenya",    bic: "ECOCKENX", swift: "ECOCKENX", logo: BK.ecobank },
      { name: "Standard Bank KE", bic: "SBICKENX", swift: "SBICKENX", logo: BK.standardbank },
    ],
    operators: [
      { id: "safaricom_ke", name: "M-Pesa",      icon: OP.mpesa,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_ke",    name: "Airtel Money", icon: OP.airtel,  features: { cashIn: true, cashOut: true, airtime: true } },
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
      { name: "BNP Paribas",      bic: "BNPAFRPP", swift: "BNPAFRPP", ibanStructure: "FRkk BBBB BGGG GGCC CCCC CCCC CKK", logo: BK.bnp_fr },
      { name: "Crédit Agricole",  bic: "AGRIFRPP", swift: "AGRIFRPP", ibanStructure: "FRkk BBBB BGGG GGCC CCCC CCCC CKK", logo: BK.credit_agricole },
      { name: "Société Générale", bic: "SOGEFRPP", swift: "SOGEFRPP", ibanStructure: "FRkk BBBB BGGG GGCC CCCC CCCC CKK", logo: BK.societe_generale },
      { name: "Revolut",          bic: "REVOFRP2", swift: "REVOFRP2", ibanStructure: "FRkk BBBB BGGG GGCC CCCC CCCC CKK", logo: BK.revolut_bank },
    ],
    operators: [],
  },
];

// ---------------------------------------------------------------------------
// World countries (additional)
// ---------------------------------------------------------------------------
export const worldCountries: Country[] = [
  { name: "United States",      code: "US", flag: "US", currency: "USD", currencySymbol: "$",   piToLocalRate: 1,      dialCode: "+1",     continent: "AMERICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "JPMorgan Chase",     bic: "CHASUS33", swift: "CHASUS33", logo: BK.chase },
      { name: "Bank of America",    bic: "BOFAUS3N", swift: "BOFAUS3N", logo: BK.bofa },
      { name: "Wells Fargo",        bic: "WFBIUS6S", swift: "WFBIUS6S", logo: BK.wells_fargo },
    ], operators: [] },
  { name: "Canada",              code: "CA", flag: "CA", currency: "CAD", currencySymbol: "$",   piToLocalRate: 1.36,   dialCode: "+1",     continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Brazil",              code: "BR", flag: "BR", currency: "BRL", currencySymbol: "R$",  piToLocalRate: 5,      dialCode: "+55",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Banco do Brasil",   bic: "BRASBRRJ", swift: "BRASBRRJ", logo: BK.banco_brasil },
      { name: "Bradesco",          bic: "BBDEBRSP", swift: "BBDEBRSP", logo: BK.bradesco },
      { name: "Itaú Unibanco",     bic: "ITAUBRSP", swift: "ITAUBRSP", logo: BK.itau },
    ], operators: [] },
  { name: "Mexico",              code: "MX", flag: "MX", currency: "MXN", currencySymbol: "$",   piToLocalRate: 17.2,   dialCode: "+52",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [{ name: "BBVA Mexico", bic: "BCMRMXMM", swift: "BCMRMXMM", logo: BK.bbva }], operators: [] },
  { name: "Argentina",           code: "AR", flag: "AR", currency: "ARS", currencySymbol: "$",   piToLocalRate: 870,    dialCode: "+54",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Colombia",            code: "CO", flag: "CO", currency: "COP", currencySymbol: "$",   piToLocalRate: 3900,   dialCode: "+57",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Chile",               code: "CL", flag: "CL", currency: "CLP", currencySymbol: "$",   piToLocalRate: 930,    dialCode: "+56",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Peru",                code: "PE", flag: "PE", currency: "PEN", currencySymbol: "S/",  piToLocalRate: 3.7,    dialCode: "+51",    continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "United Kingdom",      code: "GB", flag: "GB", currency: "GBP", currencySymbol: "£",   piToLocalRate: 0.79,   dialCode: "+44",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "HSBC",     bic: "MIDLGB22", swift: "MIDLGB22", ibanStructure: "GBkk BBBB SSSS SSCC CCCC CC", logo: BK.hsbc },
      { name: "Barclays", bic: "BARCGB22", swift: "BARCGB22", ibanStructure: "GBkk BBBB SSSS SSCC CCCC CC", logo: BK.barclays },
      { name: "Revolut",  bic: "REVOGB21", swift: "REVOGB21", ibanStructure: "GBkk BBBB SSSS SSCC CCCC CC", logo: BK.revolut_bank },
    ], operators: [] },
  { name: "Germany",             code: "DE", flag: "DE", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+49",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [{ name: "Deutsche Bank", bic: "DEUTDEDB", swift: "DEUTDEDB", ibanStructure: "DEkk BBBB BBBB CCCC CCCC CC", logo: BK.bnp_fr }], operators: [] },
  { name: "Italy",               code: "IT", flag: "IT", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+39",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Spain",               code: "ES", flag: "ES", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+34",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Netherlands",         code: "NL", flag: "NL", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+31",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Belgium",             code: "BE", flag: "BE", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+32",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Switzerland",         code: "CH", flag: "CH", currency: "CHF", currencySymbol: "CHF", piToLocalRate: 0.88,   dialCode: "+41",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Portugal",            code: "PT", flag: "PT", currency: "EUR", currencySymbol: "€",   piToLocalRate: 0.93,   dialCode: "+351",   continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Poland",              code: "PL", flag: "PL", currency: "PLN", currencySymbol: "zł",  piToLocalRate: 4.0,    dialCode: "+48",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Sweden",              code: "SE", flag: "SE", currency: "SEK", currencySymbol: "kr",  piToLocalRate: 10.5,   dialCode: "+46",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Turkey",              code: "TR", flag: "TR", currency: "TRY", currencySymbol: "₺",   piToLocalRate: 32,     dialCode: "+90",    continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Russia",              code: "RU", flag: "RU", currency: "RUB", currencySymbol: "₽",   piToLocalRate: 92,     dialCode: "+7",     continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Ukraine",             code: "UA", flag: "UA", currency: "UAH", currencySymbol: "₴",   piToLocalRate: 41,     dialCode: "+380",   continent: "EUROPE",  isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "China",               code: "CN", flag: "CN", currency: "CNY", currencySymbol: "¥",   piToLocalRate: 7.1,    dialCode: "+86",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "ICBC",         bic: "ICBKCNBJ", swift: "ICBKCNBJ", logo: BK.icbc },
      { name: "Bank of China",bic: "BKCHCNBJ", swift: "BKCHCNBJ", logo: BK.boc_cn },
    ], operators: [] },
  { name: "Japan",               code: "JP", flag: "JP", currency: "JPY", currencySymbol: "¥",   piToLocalRate: 150,    dialCode: "+81",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "India",               code: "IN", flag: "IN", currency: "INR", currencySymbol: "₹",   piToLocalRate: 83,     dialCode: "+91",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "State Bank of India", bic: "SBININBB", swift: "SBININBB", logo: BK.sbi },
      { name: "HDFC Bank",           bic: "HDFCINBB", swift: "HDFCINBB", logo: BK.hdfc },
      { name: "ICICI Bank",          bic: "ICICINBB", swift: "ICICINBB", logo: BK.icici },
    ], operators: [] },
  { name: "South Korea",         code: "KR", flag: "KR", currency: "KRW", currencySymbol: "₩",   piToLocalRate: 1340,   dialCode: "+82",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Indonesia",           code: "ID", flag: "ID", currency: "IDR", currencySymbol: "Rp",  piToLocalRate: 15700,  dialCode: "+62",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Bank Rakyat Indonesia (BRI)", bic: "BRINIDJA", swift: "BRINIDJA", logo: BK.bri },
      { name: "Bank Central Asia (BCA)",     bic: "CENAIDJA", swift: "CENAIDJA", logo: BK.bca },
      { name: "Bank Mandiri",               bic: "BMRIIDJA", swift: "BMRIIDJA", logo: BK.mandiri },
    ], operators: [] },
  { name: "Vietnam",             code: "VN", flag: "VN", currency: "VND", currencySymbol: "₫",   piToLocalRate: 25450,  dialCode: "+84",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Vietcombank", bic: "BFTVVNVX", swift: "BFTVVNVX", logo: BK.vietcombank },
    ], operators: [] },
  { name: "Thailand",            code: "TH", flag: "TH", currency: "THB", currencySymbol: "฿",   piToLocalRate: 36,     dialCode: "+66",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Siam Commercial Bank (SCB)", bic: "SICOTHBK", swift: "SICOTHBK", logo: BK.scb },
      { name: "Kasikorn Bank (KBank)",      bic: "KASITHBK", swift: "KASITHBK", logo: BK.kbank },
    ], operators: [] },
  { name: "Philippines",         code: "PH", flag: "PH", currency: "PHP", currencySymbol: "₱",   piToLocalRate: 57,     dialCode: "+63",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Malaysia",            code: "MY", flag: "MY", currency: "MYR", currencySymbol: "RM",  piToLocalRate: 4.7,    dialCode: "+60",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Maybank",   bic: "MBBEMYKL", swift: "MBBEMYKL", logo: BK.maybank },
      { name: "CIMB Bank", bic: "CIBBMYKL", swift: "CIBBMYKL", logo: BK.cimb },
    ], operators: [] },
  { name: "Singapore",           code: "SG", flag: "SG", currency: "SGD", currencySymbol: "$",   piToLocalRate: 1.35,   dialCode: "+65",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "DBS Bank", bic: "DBSSSGSG", swift: "DBSSSGSG", logo: BK.dbs },
    ], operators: [] },
  { name: "Pakistan",            code: "PK", flag: "PK", currency: "PKR", currencySymbol: "₨",   piToLocalRate: 280,    dialCode: "+92",    continent: "ASIA",    isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Bangladesh",          code: "BD", flag: "BD", currency: "BDT", currencySymbol: "৳",   piToLocalRate: 110,    dialCode: "+880",   continent: "ASIA",    isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Saudi Arabia",        code: "SA", flag: "SA", currency: "SAR", currencySymbol: "﷼",   piToLocalRate: 3.75,   dialCode: "+966",   continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Saudi National Bank (SNB)", bic: "NCBKSAJE", swift: "NCBKSAJE", logo: BK.snb },
      { name: "Al Rajhi Bank",             bic: "RJHISAJE", swift: "RJHISAJE", logo: BK.al_rajhi },
    ], operators: [] },
  { name: "UAE",                 code: "AE", flag: "AE", currency: "AED", currencySymbol: "AED", piToLocalRate: 3.67,   dialCode: "+971",   continent: "ASIA",    isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "First Abu Dhabi Bank (FAB)", bic: "NBADAEAA", swift: "NBADAEAA", logo: BK.fab },
      { name: "ADCB",                       bic: "ADCBAEAA", swift: "ADCBAEAA", logo: BK.adcb },
    ], operators: [] },
  { name: "Australia",           code: "AU", flag: "AU", currency: "AUD", currencySymbol: "$",   piToLocalRate: 1.5,    dialCode: "+61",    continent: "OCEANIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "New Zealand",         code: "NZ", flag: "NZ", currency: "NZD", currencySymbol: "$",   piToLocalRate: 1.65,   dialCode: "+64",    continent: "OCEANIA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "South Africa",        code: "ZA", flag: "ZA", currency: "ZAR", currencySymbol: "R",   piToLocalRate: 18.5,   dialCode: "+27",    continent: "AFRICA",  isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "FNB",            bic: "FIRNZAJJ", swift: "FIRNZAJJ", logo: BK.fnb },
      { name: "Standard Bank",  bic: "SBZAZAJJ", swift: "SBZAZAJJ", logo: BK.standardbank },
      { name: "Nedbank",        bic: "NEDSZAJJ", swift: "NEDSZAJJ", logo: BK.nedbank },
      { name: "Absa",           bic: "ABSAZAJJ", swift: "ABSAZAJJ", logo: BK.absa },
    ], operators: [] },
  { name: "Tanzania",  code: "TZ", flag: "TZ", currency: "TZS", currencySymbol: "TSh", piToLocalRate: 2560,  dialCode: "+255", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "NMB Bank",  bic: "NMIBTZTZ", swift: "NMIBTZTZ", logo: BK.nmb },
      { name: "CRDB Bank", bic: "CRDBTZTX", swift: "CRDBTZTX", logo: BK.crdb },
    ],
    operators: [{ id: "vodacom_tz", name: "M-Pesa", icon: OP.mpesa, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Uganda",    code: "UG", flag: "UG", currency: "UGX", currencySymbol: "USh", piToLocalRate: 3700,  dialCode: "+256", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "DFCU Bank",    bic: "DFCUUGKA", swift: "DFCUUGKA", logo: BK.dfcu },
      { name: "Stanbic Uganda",bic: "SBICUGKA", swift: "SBICUGKA", logo: BK.stanbic },
      { name: "Equity Bank UG",bic: "EQBLUGKA", swift: "EQBLUGKA", logo: BK.equity },
    ],
    operators: [
      { id: "mtn_ug",    name: "MTN MoMo",    icon: OP.mtn,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_ug", name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ] },
  { name: "Rwanda",    code: "RW", flag: "RW", currency: "RWF", currencySymbol: "RF",  piToLocalRate: 1280,  dialCode: "+250", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Bank of Kigali", bic: "BKIGRWRW", swift: "BKIGRWRW", logo: BK.bk },
      { name: "Equity Bank RW", bic: "EQBLRWRW", swift: "EQBLRWRW", logo: BK.equity },
    ],
    operators: [{ id: "mtn_rw", name: "MTN MoMo", icon: OP.mtn, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Ethiopia",  code: "ET", flag: "ET", currency: "ETB", currencySymbol: "Br",  piToLocalRate: 57,    dialCode: "+251", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Commercial Bank of Ethiopia", bic: "CBETETAA", swift: "CBETETAA", logo: BK.cbe },
    ],
    operators: [{ id: "telebirr_et", name: "Telebirr", icon: OP.telebirr, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Morocco",   code: "MA", flag: "MA", currency: "MAD", currencySymbol: "MAD", piToLocalRate: 10,    dialCode: "+212", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Attijariwafa Bank",bic: "BCMAMAMC", swift: "BCMAMAMC", logo: BK.attijariwafa },
      { name: "BMCE Bank",        bic: "BMCEMAMC", swift: "BMCEMAMC", logo: BK.bmce },
    ],
    operators: [
      { id: "inwi_ma",  name: "Inwi Money",   icon: OP.inwi,         features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "orange_ma",name: "Orange Money", icon: OP.orange,       features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "iam_ma",   name: "Maroc Telecom",icon: OP.maroctelecom, features: { cashIn: false, cashOut: false, airtime: true } },
    ] },
  { name: "Tunisia",   code: "TN", flag: "TN", currency: "TND", currencySymbol: "DT",  piToLocalRate: 3.1,   dialCode: "+216", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "BIAT",           bic: "BIATTNTT", swift: "BIATTNTT", logo: BK.biat },
      { name: "STB Bank",       bic: "STBKTNTT", swift: "STBKTNTT", logo: BK.stb },
    ], operators: [] },
  { name: "Egypt",     code: "EG", flag: "EG", currency: "EGP", currencySymbol: "LE",  piToLocalRate: 49,    dialCode: "+20",  continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "National Bank of Egypt", bic: "NBEGEGCX", swift: "NBEGEGCX", logo: BK.nbe },
      { name: "CIB Egypt",              bic: "CIBEEGCX", swift: "CIBEEGCX", logo: BK.cib_eg },
    ], operators: [] },
  { name: "Madagascar",code: "MG", flag: "MG", currency: "MGA", currencySymbol: "Ar",  piToLocalRate: 4500,  dialCode: "+261", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "BOA Madagascar", bic: "BOAFMGMG", swift: "BOAFMGMG", logo: BK.boa },
    ],
    operators: [
      { id: "orange_mg", name: "Orange Money", icon: OP.orange, features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "telma_mg",  name: "MVola (Telma)",icon: OP.telma,  features: { cashIn: true, cashOut: true, airtime: true } },
    ] },
  { name: "Togo",      code: "TG", flag: "TG", currency: "XOF", currencySymbol: "FCFA",piToLocalRate: 605.5, dialCode: "+228", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Ecobank Togo",       bic: "ECOCTGTG", swift: "ECOCTGTG", logo: BK.ecobank },
      { name: "BOA Togo",           bic: "BOAFTGTG", swift: "BOAFTGTG", logo: BK.boa },
      { name: "Société Générale TG",bic: "SGCITGTG", swift: "SGCITGTG", logo: BK.societe_generale },
    ],
    operators: [{ id: "moov_tg", name: "Moov Money (Flooz)", icon: OP.moov, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Niger",     code: "NE", flag: "NE", currency: "XOF", currencySymbol: "FCFA",piToLocalRate: 605.5, dialCode: "+227", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Ecobank Niger",bic: "ECOCNENI", swift: "ECOCNENI", logo: BK.ecobank },
      { name: "BOA Niger",    bic: "BOAFNENI", swift: "BOAFNENI", logo: BK.boa },
    ],
    operators: [{ id: "airtel_ne", name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Tchad",     code: "TD", flag: "TD", currency: "XAF", currencySymbol: "FCFA",piToLocalRate: 605.5, dialCode: "+235", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Ecobank Tchad",bic: "ECOCTDND", swift: "ECOCTDND", logo: BK.ecobank },
    ],
    operators: [{ id: "airtel_td", name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Zambia",    code: "ZM", flag: "ZM", currency: "ZMW", currencySymbol: "ZK",  piToLocalRate: 26,    dialCode: "+260", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Stanbic Zambia",bic: "SBICZMLX", swift: "SBICZMLX", logo: BK.stanbic },
      { name: "Zanaco",        bic: "ZACCZMLU", swift: "ZACCZMLU" },
    ],
    operators: [
      { id: "mtn_zm",   name: "MTN MoMo",    icon: OP.mtn,   features: { cashIn: true, cashOut: true, airtime: true } },
      { id: "airtel_zm",name: "Airtel Money", icon: OP.airtel, features: { cashIn: true, cashOut: true, airtime: true } },
    ] },
  { name: "Mozambique",code: "MZ", flag: "MZ", currency: "MZN", currencySymbol: "MT",  piToLocalRate: 64,    dialCode: "+258", continent: "AFRICA", isoStandard: "ISO20022", isActive: false,
    banks: [
      { name: "Standard Bank MZ",bic: "SBICMZMX", swift: "SBICMZMX", logo: BK.standardbank },
    ],
    operators: [{ id: "vodacom_mz", name: "M-Pesa", icon: OP.mpesa, features: { cashIn: true, cashOut: true, airtime: true } }] },
  { name: "Haiti",              code: "HT", flag: "HT", currency: "HTG", currencySymbol: "G",  piToLocalRate: 132, dialCode: "+509",   continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Dominican Republic", code: "DO", flag: "DO", currency: "DOP", currencySymbol: "$",  piToLocalRate: 59,  dialCode: "+1-809", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
  { name: "Jamaica",            code: "JM", flag: "JM", currency: "JMD", currencySymbol: "$",  piToLocalRate: 156, dialCode: "+1-876", continent: "AMERICA", isoStandard: "ISO20022", isActive: false, banks: [], operators: [] },
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
