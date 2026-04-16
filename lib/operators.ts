// lib/operators.ts
// Complete list of mobile money operators by country with real logo URLs

export interface MobileOperator {
  name: string;
  logo: string; // full URL
  type: "mobile_money" | "telecom" | "bank_app";
  ussdCode?: string;
}

// ---------------------------------------------------------------------------
// Centralized logo registry (Wikipedia / official CDN URLs)
// ---------------------------------------------------------------------------
const OP_LOGOS: Record<string, string> = {
  // Pan-African operators
  orange:         "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg",
  mtn:            "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg",
  airtel:         "https://upload.wikimedia.org/wikipedia/commons/3/3a/Airtel_logo-01.png",
  moov:           "https://upload.wikimedia.org/wikipedia/fr/1/1d/Moov_Africa_logo.png",
  wave:           "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Wave_Logo_RGB.png/512px-Wave_Logo_RGB.png",
  africell:       "https://upload.wikimedia.org/wikipedia/commons/9/99/Logoafricell.png",
  vodacom:        "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
  vodafone:       "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
  tigo:           "https://upload.wikimedia.org/wikipedia/commons/4/47/Tigo.JPG",
  // East Africa
  mpesa:          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/200px-M-PESA_LOGO-01.svg.png",
  telebirr:       "https://upload.wikimedia.org/wikipedia/en/3/34/Telebirr_logo.png",
  equity:         "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Equity_Bank_logo.svg/200px-Equity_Bank_logo.svg.png",
  utl:            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/UTL_logo.svg/200px-UTL_logo.svg.png",
  halotel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Halotel_Logo.svg/200px-Halotel_Logo.svg.png",
  // West Africa
  free:           "https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/Free_logo.svg/200px-Free_logo.svg.png",
  express_union:  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Express_Union_Logo.png/200px-Express_Union_Logo.png",
  coris:          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Coris_Bank_International_logo.svg/200px-Coris_Bank_International_logo.svg.png",
  sama:           "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sama_money_logo.png/200px-Sama_money_logo.png",
  celtiis:        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Celtiis_logo.png/200px-Celtiis_logo.png",
  togocel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Togocel_logo.svg/200px-Togocel_logo.svg.png",
  areeba:         "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Areeba_logo.png/200px-Areeba_logo.png",
  gmoney:         "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/G-Money_logo.png/200px-G-Money_logo.png",
  zeepay:         "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Zeepay_logo.png/200px-Zeepay_logo.png",
  emoney:         "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/E-money_logo.png/200px-E-money_logo.png",
  yup:            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/YUP_logo.png/200px-YUP_logo.png",
  // Nigeria
  opay:           "https://upload.wikimedia.org/wikipedia/commons/c/cb/Opay_Digital_Services_Limited.png",
  palmpay:        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/PalmPay_logo.svg/200px-PalmPay_logo.svg.png",
  paga:           "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Paga_logo.png/200px-Paga_logo.png",
  kuda:           "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Kuda_Bank_logo.svg/200px-Kuda_Bank_logo.svg.png",
  glo:            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Glo_logo.svg/200px-Glo_logo.svg.png",
  "9mobile":      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/9mobile_logo.png/200px-9mobile_logo.png",
  // South/Central Africa
  unitel:         "https://fr.wikipedia.org/wiki/Unitel#/media/Fichier%3AUnitel_Logo_2005.svg",
  movicel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Movicel_logo.svg/200px-Movicel_logo.svg.png",
  multicaixa:     "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Multicaixa_logo.png/200px-Multicaixa_logo.png",
  zamtel:         "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Zamtel_logo.svg/200px-Zamtel_logo.svg.png",
  zoona:          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Zoona_logo.png/200px-Zoona_logo.png",
  movitel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Movitel_logo.svg/200px-Movitel_logo.svg.png",
  mkesh:          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Mkesh_logo.png/200px-Mkesh_logo.png",
  cellc:          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Cell_C_logo.svg/200px-Cell_C_logo.svg.png",
  fnb:            "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/FNB_logo.svg/200px-FNB_logo.svg.png",
  standardbank:   "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Standard_Bank_logo.svg/200px-Standard_Bank_logo.svg.png",
  telkom:         "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Telkom_SA_SOC_Ltd_logo.svg/200px-Telkom_SA_SOC_Ltd_logo.svg.png",
  // North Africa & Middle East
  inwi:           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Inwi_logo.svg/200px-Inwi_logo.svg.png",
  maroctelecom:   "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Maroc_Telecom_logo.svg/200px-Maroc_Telecom_logo.svg.png",
  fawry:          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Fawry_logo.svg/200px-Fawry_logo.svg.png",
  etisalat:       "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Etisalat_logo.svg/200px-Etisalat_logo.svg.png",
  we:             "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/WE_Telecom_Egypt_logo.svg/200px-WE_Telecom_Egypt_logo.svg.png",
  ooredoo:        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Ooredoo_logo.svg/200px-Ooredoo_logo.svg.png",
  tunisietelecom: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Tunisie_Telecom_logo.svg/200px-Tunisie_Telecom_logo.svg.png",
  d17:            "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/D17_logo.png/200px-D17_logo.png",
  telma:          "https://upload.wikimedia.org/wikipedia/commons/7/71/Telma-logo.jpg",
  cbe:            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Commercial_Bank_of_Ethiopia_logo.svg/200px-Commercial_Bank_of_Ethiopia_logo.svg.png",
  mbirr:          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/MBIRR_logo.png/200px-MBIRR_logo.png",
  // Romania
  digi:           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Digi_Communications_logo.svg/200px-Digi_Communications_logo.svg.png",
  vodafone_ro:    "https://upload.wikimedia.org/wikipedia/commons/e/ef/Vodafone_Logo.svg",
  orange_ro:      "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg",
  telekom_ro:     "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Telekom_Logo_2013.svg/200px-Telekom_Logo_2013.svg.png",
  // Europe & Americas
  paypal:         "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png",
  venmo:          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Venmo_logo.svg/200px-Venmo_logo.svg.png",
  cashapp:        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Square_Cash_app_logo.svg/200px-Square_Cash_app_logo.svg.png",
  zelle:          "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Zelle_%28payment_service%29_logo.svg/200px-Zelle_%28payment_service%29_logo.svg.png",
  monzo:          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Monzo_logo.svg/200px-Monzo_logo.svg.png",
  revolut:        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Revolut_logo.svg/200px-Revolut_logo.svg.png",
  sfr:            "https://upload.wikimedia.org/wikipedia/commons/9/97/SFR-2022-logo.svg",
  bouygues:       "https://upload.wikimedia.org/wikipedia/commons/3/31/Bouygues_Telecom_%28alt_logo%29.svg",
  pix:            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_PIX_verde_e_branco.svg/200px-Logo_PIX_verde_e_branco.svg.png",
  picpay:         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/PicPay.svg/200px-PicPay.svg.png",
  mercadopago:    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/MercadoPago_logo.svg/200px-MercadoPago_logo.svg.png",
  nubank:         "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Nubank_logo_2021.svg/200px-Nubank_logo_2021.svg.png",
  bbva:           "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/BBVA_2019.svg/200px-BBVA_2019.svg.png",
  telcel:         "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Telcel_logo.svg/200px-Telcel_logo.svg.png",
  moncash:        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/MonCash_logo.png/200px-MonCash_logo.png",
  lajancash:      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Lajan_Cash_logo.png/200px-Lajan_Cash_logo.png",
  natcom:         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Natcom_logo.png/200px-Natcom_logo.png",
  digicel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Digicel_logo.svg/200px-Digicel_logo.svg.png",
  tpago:          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Tpago_logo.png/200px-Tpago_logo.png",
  claro:          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Claro_logo.svg/200px-Claro_logo.svg.png",
  altice:         "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Altice_logo.svg/200px-Altice_logo.svg.png",
  ncb:            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/NCB_logo.png/200px-NCB_logo.png",
  flow:           "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Flow_logo.svg/200px-Flow_logo.svg.png",
  // Asia
  paytm:          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/200px-Paytm_Logo_%28standalone%29.svg.png",
  phonepe:        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/PhonePe_Logo.svg/200px-PhonePe_Logo.svg.png",
  gpay:           "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/200px-Google_Pay_Logo.svg.png",
  bhim:           "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/BHIM_logo.svg/200px-BHIM_logo.svg.png",
  jio:            "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Jio_logo.svg/200px-Jio_logo.svg.png",
  vi:             "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Vi_%28Vodafone_Idea%29_logo.svg/200px-Vi_%28Vodafone_Idea%29_logo.svg.png",
  jazz:           "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Jazz_%28Pakistan%29_logo.svg/200px-Jazz_%28Pakistan%29_logo.svg.png",
  easypaisa:      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Easypaisa_logo.svg/200px-Easypaisa_logo.svg.png",
  ubl:            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/United_Bank_Limited_logo.svg/200px-United_Bank_Limited_logo.svg.png",
  bkash:          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/BKASH_logo.svg/200px-BKASH_logo.svg.png",
  nagad:          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Nagad_Logo.svg/200px-Nagad_Logo.svg.png",
  rocket:         "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/DBBL_Rocket_Logo.png/200px-DBBL_Rocket_Logo.png",
  upay:           "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Upay_logo.png/200px-Upay_logo.png",
  gcash:          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/GCash_logo.svg/200px-GCash_logo.svg.png",
  maya:           "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Maya_%28app%29_logo.svg/200px-Maya_%28app%29_logo.svg.png",
  coins:          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Coins.ph_logo.png/200px-Coins.ph_logo.png",
  globe:          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Globe_Telecom_logo.svg/200px-Globe_Telecom_logo.svg.png",
  smart:          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Smart_Communications_logo.svg/200px-Smart_Communications_logo.svg.png",
  gopay:          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/GoPay_logo.svg/200px-GoPay_logo.svg.png",
  ovo:            "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/OVO_%28mobile_payment%29_logo.svg/200px-OVO_%28mobile_payment%29_logo.svg.png",
  dana:           "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/DANA_logo.svg/200px-DANA_logo.svg.png",
  shopeepay:      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/ShopeePay_logo.svg/200px-ShopeePay_logo.svg.png",
  linkaja:        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/LinkAja_logo.svg/200px-LinkAja_logo.svg.png",
  momo_vn:        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/MoMo_Logo.png/200px-MoMo_Logo.png",
  zalopay:        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/ZaloPay_Logo.png/200px-ZaloPay_Logo.png",
  vnpay:          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/VNPay_logo.svg/200px-VNPay_logo.svg.png",
  viettel:        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Viettel_logo.svg/200px-Viettel_logo.svg.png",
  truemoney:      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/True_Money_logo.svg/200px-True_Money_logo.svg.png",
  promptpay:      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/PromptPay_logo.svg/200px-PromptPay_logo.svg.png",
  linepay:        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/LINE_Pay_logo.svg/200px-LINE_Pay_logo.svg.png",
  touchngo:       "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Touch_%27n_Go_eWallet_logo.svg/200px-Touch_%27n_Go_eWallet_logo.svg.png",
  grabpay:        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Grab_%28application%29_logo.svg/200px-Grab_%28application%29_logo.svg.png",
  boost:          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Boost_logo.svg/200px-Boost_logo.svg.png",
};

export function getOperatorLogo(key: string): string {
  return OP_LOGOS[key] || `https://ui-avatars.com/api/?name=${encodeURIComponent(key)}&background=1e293b&color=fff&size=64`;
}

// ---------------------------------------------------------------------------
// Country operators map (ISO 3166-1 alpha-2 → operators)
// ---------------------------------------------------------------------------
export const COUNTRY_OPERATORS: Record<string, MobileOperator[]> = {
  // RDC - Congo Kinshasa
  CD: [
    { name: "Vodacom M-Pesa",   logo: OP_LOGOS.mpesa,   type: "mobile_money", ussdCode: "*150#" },
    { name: "Orange Money",      logo: OP_LOGOS.orange,  type: "mobile_money", ussdCode: "*144#" },
    { name: "Airtel Money",      logo: OP_LOGOS.airtel,  type: "mobile_money", ussdCode: "*501#" },
    { name: "Africell Money",    logo: OP_LOGOS.africell,type: "mobile_money" },
  ],
  // Congo Brazzaville
  CG: [
    { name: "MTN Mobile Money",  logo: OP_LOGOS.mtn,    type: "mobile_money", ussdCode: "*155#" },
    { name: "Airtel Money",      logo: OP_LOGOS.airtel, type: "mobile_money", ussdCode: "*501#" },
  ],
  // Cameroun
  CM: [
    { name: "MTN Mobile Money",  logo: OP_LOGOS.mtn,           type: "mobile_money", ussdCode: "*126#" },
    { name: "Orange Money",      logo: OP_LOGOS.orange,        type: "mobile_money", ussdCode: "*150#" },
    { name: "Express Union Mobile", logo: OP_LOGOS.express_union, type: "mobile_money" },
    { name: "YUP",               logo: OP_LOGOS.yup,           type: "mobile_money" },
  ],
  // Nigeria
  NG: [
    { name: "MTN MoMo",    logo: OP_LOGOS.mtn,      type: "mobile_money", ussdCode: "*223#" },
    { name: "Airtel Money",logo: OP_LOGOS.airtel,   type: "mobile_money" },
    { name: "9mobile Money",logo: OP_LOGOS["9mobile"],type: "mobile_money" },
    { name: "Glo Mobile Money", logo: OP_LOGOS.glo, type: "mobile_money" },
    { name: "OPay",        logo: OP_LOGOS.opay,     type: "mobile_money" },
    { name: "PalmPay",     logo: OP_LOGOS.palmpay,  type: "mobile_money" },
    { name: "Paga",        logo: OP_LOGOS.paga,     type: "mobile_money" },
    { name: "Kuda",        logo: OP_LOGOS.kuda,     type: "bank_app" },
  ],
  // Ghana
  GH: [
    { name: "MTN Mobile Money",  logo: OP_LOGOS.mtn,      type: "mobile_money", ussdCode: "*170#" },
    { name: "Vodafone Cash",     logo: OP_LOGOS.vodafone, type: "mobile_money", ussdCode: "*110#" },
    { name: "AirtelTigo Money",  logo: OP_LOGOS.airtel,   type: "mobile_money", ussdCode: "*500#" },
    { name: "G-Money",           logo: OP_LOGOS.gmoney,   type: "mobile_money" },
    { name: "Zeepay",            logo: OP_LOGOS.zeepay,   type: "mobile_money" },
  ],
  // Senegal
  SN: [
    { name: "Orange Money", logo: OP_LOGOS.orange, type: "mobile_money", ussdCode: "#144#" },
    { name: "Wave",         logo: OP_LOGOS.wave,   type: "mobile_money" },
    { name: "Free Money",   logo: OP_LOGOS.free,   type: "mobile_money", ussdCode: "#555#" },
    { name: "E-Money",      logo: OP_LOGOS.emoney, type: "mobile_money" },
  ],
  // Cote d'Ivoire
  CI: [
    { name: "Orange Money",      logo: OP_LOGOS.orange, type: "mobile_money", ussdCode: "#144#" },
    { name: "MTN Mobile Money",  logo: OP_LOGOS.mtn,    type: "mobile_money", ussdCode: "*133#" },
    { name: "Wave",              logo: OP_LOGOS.wave,   type: "mobile_money" },
    { name: "Moov Money",        logo: OP_LOGOS.moov,   type: "mobile_money", ussdCode: "*155#" },
  ],
  // Mali
  ML: [
    { name: "Orange Money", logo: OP_LOGOS.orange, type: "mobile_money", ussdCode: "#144#" },
    { name: "Moov Money",   logo: OP_LOGOS.moov,   type: "mobile_money" },
    { name: "Sama Money",   logo: OP_LOGOS.sama,   type: "mobile_money" },
  ],
  // Burkina Faso
  BF: [
    { name: "Orange Money", logo: OP_LOGOS.orange, type: "mobile_money", ussdCode: "#144#" },
    { name: "Moov Money",   logo: OP_LOGOS.moov,   type: "mobile_money", ussdCode: "*555#" },
    { name: "Coris Money",  logo: OP_LOGOS.coris,  type: "mobile_money" },
  ],
  // Benin
  BJ: [
    { name: "MTN Mobile Money", logo: OP_LOGOS.mtn,     type: "mobile_money", ussdCode: "*880#" },
    { name: "Moov Money",       logo: OP_LOGOS.moov,    type: "mobile_money", ussdCode: "*155#" },
    { name: "Celtiis Money",    logo: OP_LOGOS.celtiis, type: "mobile_money" },
  ],
  // Togo
  TG: [
    { name: "Flooz (Moov)",  logo: OP_LOGOS.moov,    type: "mobile_money", ussdCode: "*145#" },
    { name: "T-Money",       logo: OP_LOGOS.togocel, type: "mobile_money", ussdCode: "*150#" },
  ],
  // Niger
  NE: [
    { name: "Airtel Money", logo: OP_LOGOS.airtel, type: "mobile_money", ussdCode: "*401#" },
    { name: "Orange Money", logo: OP_LOGOS.orange, type: "mobile_money" },
    { name: "Moov Money",   logo: OP_LOGOS.moov,   type: "mobile_money" },
  ],
  // Guinea
  GN: [
    { name: "Orange Money",      logo: OP_LOGOS.orange,  type: "mobile_money", ussdCode: "*144#" },
    { name: "MTN Mobile Money",  logo: OP_LOGOS.mtn,     type: "mobile_money" },
    { name: "Areeba Money",      logo: OP_LOGOS.areeba,  type: "mobile_money" },
  ],
  // Gabon
  GA: [
    { name: "Airtel Money", logo: OP_LOGOS.airtel, type: "mobile_money", ussdCode: "*126#" },
    { name: "Moov Money",   logo: OP_LOGOS.moov,   type: "mobile_money" },
  ],
  // Kenya
  KE: [
    { name: "M-Pesa",      logo: OP_LOGOS.mpesa,   type: "mobile_money", ussdCode: "*334#" },
    { name: "Airtel Money",logo: OP_LOGOS.airtel,  type: "mobile_money" },
    { name: "T-Kash",      logo: OP_LOGOS.telkom,  type: "mobile_money" },
    { name: "Equitel",     logo: OP_LOGOS.equity,  type: "mobile_money" },
  ],
  // Tanzania
  TZ: [
    { name: "M-Pesa",             logo: OP_LOGOS.mpesa,   type: "mobile_money", ussdCode: "*150*00#" },
    { name: "Tigo Pesa",          logo: OP_LOGOS.tigo,    type: "mobile_money", ussdCode: "*150*01#" },
    { name: "Airtel Money",       logo: OP_LOGOS.airtel,  type: "mobile_money", ussdCode: "*150*60#" },
    { name: "Halotel Halopesa",   logo: OP_LOGOS.halotel, type: "mobile_money" },
  ],
  // Uganda
  UG: [
    { name: "MTN Mobile Money",   logo: OP_LOGOS.mtn,    type: "mobile_money", ussdCode: "*165#" },
    { name: "Airtel Money",       logo: OP_LOGOS.airtel, type: "mobile_money", ussdCode: "*185#" },
    { name: "M-Sente (UTL)",      logo: OP_LOGOS.utl,    type: "mobile_money" },
  ],
  // Rwanda
  RW: [
    { name: "MTN Mobile Money",   logo: OP_LOGOS.mtn,    type: "mobile_money", ussdCode: "*182#" },
    { name: "Airtel Money",       logo: OP_LOGOS.airtel, type: "mobile_money" },
    { name: "Tigo Cash",          logo: OP_LOGOS.tigo,   type: "mobile_money" },
  ],
  // Ethiopia
  ET: [
    { name: "Telebirr",   logo: OP_LOGOS.telebirr, type: "mobile_money", ussdCode: "*127#" },
    { name: "CBE Birr",   logo: OP_LOGOS.cbe,      type: "mobile_money" },
    { name: "M-Birr",     logo: OP_LOGOS.mbirr,    type: "mobile_money" },
  ],
  // South Africa
  ZA: [
    { name: "Vodacom",                    logo: OP_LOGOS.vodacom,      type: "telecom" },
    { name: "MTN",                        logo: OP_LOGOS.mtn,          type: "telecom" },
    { name: "Cell C",                     logo: OP_LOGOS.cellc,        type: "telecom" },
    { name: "Telkom",                     logo: OP_LOGOS.telkom,       type: "telecom" },
    { name: "FNB eWallet",                logo: OP_LOGOS.fnb,          type: "mobile_money" },
    { name: "Standard Bank Instant Money",logo: OP_LOGOS.standardbank, type: "mobile_money" },
  ],
  // Angola
  AO: [
    { name: "Unitel Money",      logo: OP_LOGOS.unitel,     type: "mobile_money" },
    { name: "Movicel Money",     logo: OP_LOGOS.movicel,    type: "mobile_money" },
    { name: "Multicaixa Express",logo: OP_LOGOS.multicaixa, type: "mobile_money" },
  ],
  // Madagascar
  MG: [
    { name: "Orange Money", logo: OP_LOGOS.orange, type: "mobile_money", ussdCode: "#144#" },
    { name: "MVola (Telma)",logo: OP_LOGOS.telma,  type: "mobile_money", ussdCode: "*111#" },
    { name: "Airtel Money", logo: OP_LOGOS.airtel, type: "mobile_money" },
  ],
  // Zambia
  ZM: [
    { name: "MTN Mobile Money",   logo: OP_LOGOS.mtn,    type: "mobile_money" },
    { name: "Airtel Money",       logo: OP_LOGOS.airtel, type: "mobile_money" },
    { name: "Zamtel Kwacha",      logo: OP_LOGOS.zamtel, type: "mobile_money" },
    { name: "Zoona",              logo: OP_LOGOS.zoona,  type: "mobile_money" },
  ],
  // Mozambique
  MZ: [
    { name: "M-Pesa",   logo: OP_LOGOS.mpesa,   type: "mobile_money" },
    { name: "E-Mola",   logo: OP_LOGOS.movitel, type: "mobile_money" },
    { name: "mKesh",    logo: OP_LOGOS.mkesh,   type: "mobile_money" },
  ],
  // Morocco
  MA: [
    { name: "Inwi Money",       logo: OP_LOGOS.inwi,          type: "mobile_money" },
    { name: "Orange Money",     logo: OP_LOGOS.orange,        type: "mobile_money" },
    { name: "Maroc Telecom",    logo: OP_LOGOS.maroctelecom,  type: "telecom" },
  ],
  // Egypt
  EG: [
    { name: "Vodafone Cash", logo: OP_LOGOS.vodafone, type: "mobile_money" },
    { name: "Etisalat Cash", logo: OP_LOGOS.etisalat, type: "mobile_money" },
    { name: "Orange Cash",   logo: OP_LOGOS.orange,   type: "mobile_money" },
    { name: "WE Pay",        logo: OP_LOGOS.we,       type: "mobile_money" },
    { name: "Fawry",         logo: OP_LOGOS.fawry,    type: "mobile_money" },
  ],
  // Tunisia
  TN: [
    { name: "Ooredoo",          logo: OP_LOGOS.ooredoo,         type: "telecom" },
    { name: "Orange Tunisie",   logo: OP_LOGOS.orange,          type: "telecom" },
    { name: "Tunisie Telecom",  logo: OP_LOGOS.tunisietelecom,  type: "telecom" },
    { name: "D17",              logo: OP_LOGOS.d17,             type: "mobile_money" },
  ],
  // Chad
  TD: [
    { name: "Airtel Money",logo: OP_LOGOS.airtel, type: "mobile_money" },
    { name: "Tigo Cash",   logo: OP_LOGOS.tigo,   type: "mobile_money" },
  ],
  // France
  FR: [
    { name: "Orange",          logo: OP_LOGOS.orange,   type: "telecom" },
    { name: "SFR",             logo: OP_LOGOS.sfr,      type: "telecom" },
    { name: "Bouygues Telecom",logo: OP_LOGOS.bouygues, type: "telecom" },
    { name: "Free Mobile",     logo: OP_LOGOS.free,     type: "telecom" },
  ],
  // USA
  US: [
    { name: "Venmo",   logo: OP_LOGOS.venmo,   type: "mobile_money" },
    { name: "Cash App",logo: OP_LOGOS.cashapp, type: "mobile_money" },
    { name: "Zelle",   logo: OP_LOGOS.zelle,   type: "mobile_money" },
    { name: "PayPal",  logo: OP_LOGOS.paypal,  type: "mobile_money" },
  ],
  // UK
  GB: [
    { name: "PayPal",  logo: OP_LOGOS.paypal,  type: "mobile_money" },
    { name: "Monzo",   logo: OP_LOGOS.monzo,   type: "bank_app" },
    { name: "Revolut", logo: OP_LOGOS.revolut, type: "bank_app" },
  ],
  // India
  IN: [
    { name: "Paytm",    logo: OP_LOGOS.paytm,   type: "mobile_money" },
    { name: "PhonePe",  logo: OP_LOGOS.phonepe, type: "mobile_money" },
    { name: "Google Pay",logo: OP_LOGOS.gpay,   type: "mobile_money" },
    { name: "BHIM UPI", logo: OP_LOGOS.bhim,    type: "mobile_money" },
    { name: "Jio",      logo: OP_LOGOS.jio,     type: "telecom" },
    { name: "Airtel",   logo: OP_LOGOS.airtel,  type: "telecom" },
    { name: "Vi",       logo: OP_LOGOS.vi,      type: "telecom" },
  ],
  // Pakistan
  PK: [
    { name: "JazzCash",  logo: OP_LOGOS.jazz,      type: "mobile_money" },
    { name: "Easypaisa", logo: OP_LOGOS.easypaisa, type: "mobile_money" },
    { name: "UBL Omni",  logo: OP_LOGOS.ubl,       type: "mobile_money" },
  ],
  // Bangladesh
  BD: [
    { name: "bKash",  logo: OP_LOGOS.bkash,  type: "mobile_money" },
    { name: "Nagad",  logo: OP_LOGOS.nagad,  type: "mobile_money" },
    { name: "Rocket", logo: OP_LOGOS.rocket, type: "mobile_money" },
    { name: "Upay",   logo: OP_LOGOS.upay,   type: "mobile_money" },
  ],
  // Philippines
  PH: [
    { name: "GCash",     logo: OP_LOGOS.gcash, type: "mobile_money" },
    { name: "Maya",      logo: OP_LOGOS.maya,  type: "mobile_money" },
    { name: "Coins.ph",  logo: OP_LOGOS.coins, type: "mobile_money" },
    { name: "Globe",     logo: OP_LOGOS.globe, type: "telecom" },
    { name: "Smart",     logo: OP_LOGOS.smart, type: "telecom" },
  ],
  // Indonesia
  ID: [
    { name: "GoPay",      logo: OP_LOGOS.gopay,     type: "mobile_money" },
    { name: "OVO",        logo: OP_LOGOS.ovo,       type: "mobile_money" },
    { name: "DANA",       logo: OP_LOGOS.dana,      type: "mobile_money" },
    { name: "ShopeePay",  logo: OP_LOGOS.shopeepay, type: "mobile_money" },
    { name: "LinkAja",    logo: OP_LOGOS.linkaja,   type: "mobile_money" },
  ],
  // Vietnam
  VN: [
    { name: "MoMo",          logo: OP_LOGOS.momo_vn, type: "mobile_money" },
    { name: "ZaloPay",       logo: OP_LOGOS.zalopay, type: "mobile_money" },
    { name: "VNPay",         logo: OP_LOGOS.vnpay,   type: "mobile_money" },
    { name: "Viettel Money", logo: OP_LOGOS.viettel, type: "mobile_money" },
  ],
  // Thailand
  TH: [
    { name: "TrueMoney Wallet", logo: OP_LOGOS.truemoney, type: "mobile_money" },
    { name: "PromptPay",        logo: OP_LOGOS.promptpay, type: "mobile_money" },
    { name: "Rabbit LINE Pay",  logo: OP_LOGOS.linepay,   type: "mobile_money" },
  ],
  // Malaysia
  MY: [
    { name: "Touch 'n Go eWallet",logo: OP_LOGOS.touchngo, type: "mobile_money" },
    { name: "GrabPay",            logo: OP_LOGOS.grabpay,  type: "mobile_money" },
    { name: "Boost",              logo: OP_LOGOS.boost,    type: "mobile_money" },
  ],
  // Brazil
  BR: [
    { name: "PIX",          logo: OP_LOGOS.pix,         type: "mobile_money" },
    { name: "PicPay",       logo: OP_LOGOS.picpay,      type: "mobile_money" },
    { name: "Mercado Pago", logo: OP_LOGOS.mercadopago, type: "mobile_money" },
    { name: "Nubank",       logo: OP_LOGOS.nubank,      type: "bank_app" },
  ],
  // Mexico
  MX: [
    { name: "Mercado Pago", logo: OP_LOGOS.mercadopago, type: "mobile_money" },
    { name: "BBVA",         logo: OP_LOGOS.bbva,        type: "bank_app" },
    { name: "Telcel",       logo: OP_LOGOS.telcel,      type: "telecom" },
  ],
  // Haiti
  HT: [
    { name: "MonCash",   logo: OP_LOGOS.moncash,   type: "mobile_money" },
    { name: "Lajan Cash",logo: OP_LOGOS.lajancash, type: "mobile_money" },
    { name: "Natcom",    logo: OP_LOGOS.natcom,    type: "telecom" },
    { name: "Digicel",   logo: OP_LOGOS.digicel,   type: "telecom" },
  ],
  // Dominican Republic
  DO: [
    { name: "tPago",  logo: OP_LOGOS.tpago,  type: "mobile_money" },
    { name: "Claro",  logo: OP_LOGOS.claro,  type: "telecom" },
    { name: "Altice", logo: OP_LOGOS.altice, type: "telecom" },
  ],
  // Jamaica
  JM: [
    { name: "NCB Quisk",logo: OP_LOGOS.ncb,    type: "mobile_money" },
    { name: "Digicel",  logo: OP_LOGOS.digicel,type: "telecom" },
    { name: "Flow",     logo: OP_LOGOS.flow,   type: "telecom" },
  ],
  // Romania
  RO: [
    { name: "Digi Mobil",       logo: OP_LOGOS.digi,        type: "telecom" },
    { name: "Vodafone Romania", logo: OP_LOGOS.vodafone_ro, type: "telecom" },
    { name: "Orange Romania",   logo: OP_LOGOS.orange_ro,   type: "telecom" },
    { name: "Telekom Romania",  logo: OP_LOGOS.telekom_ro,  type: "telecom" },
    { name: "Revolut",          logo: OP_LOGOS.revolut,     type: "bank_app" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
