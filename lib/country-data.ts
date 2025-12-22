// =============================
// Pi Mobile Pay / Elara
// Unified Payments Configuration
// =============================

export type PaymentRules = {
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  feeFlat?: number;
  processingTime: string; // "Instant", "5–30 min", "24h"
};

export type PaymentCapabilities = {
  deposit: boolean;
  withdraw: boolean;
  piNetwork: boolean;
};

export type ServiceStatus = {
  enabled: boolean;
  maintenance?: boolean;
  message?: string;
};

export type FieldValidation = {
  regex?: string;
  example?: string;
  minLength?: number;
  maxLength?: number;
};

export type MobileMoneyOperator = {
  name: string;
  icon: string;
  providerCode: string;
  priority: number; // 1 = top
  capabilities: PaymentCapabilities;
  rules: PaymentRules;
  status: ServiceStatus;
  validation?: FieldValidation; // phone number rules
};

export type Bank = {
  name: string;
  swift: string;
  icon: string;
  providerCode: string;
  priority: number;
  capabilities: PaymentCapabilities;
  rules: PaymentRules;
  status: ServiceStatus;
  validation?: FieldValidation; // account number / IBAN rules
};

export type CountryCompliance = {
  kycRequired: boolean;
  kycLevel?: "basic" | "full";
  dailyLimit?: number;
};

export type Country = {
  code: string;
  name: string;
  currency: string;
  dialCode: string;
  piToLocalRate: number;
  exchangeSource?: "manual" | "api";
  lastUpdated?: string;
  flag: string;
  compliance?: CountryCompliance;
  mobileMoneyOperators: MobileMoneyOperator[];
  banks?: Bank[];
};

// =============================
// Countries
// =============================

export const countries: Country[] = [
  {
    code: "CD",
    name: "République Démocratique du Congo",
    currency: "CDF",
    dialCode: "+243",
    piToLocalRate: 2400,
    exchangeSource: "manual",
    lastUpdated: "2025-12-21",
    flag: "/flags/cd.svg",
    compliance: {
      kycRequired: true,
      kycLevel: "basic",
      dailyLimit: 5000
    },
    mobileMoneyOperators: [
      {
        name: "M-Pesa",
        icon: "/icons/mpesa.svg",
        providerCode: "CD_MPESA",
        priority: 1,
        capabilities: { deposit: true, withdraw: true, piNetwork: true },
        rules: {
          minAmount: 1,
          maxAmount: 5000,
          feePercent: 1.5,
          processingTime: "Instant"
        },
        status: { enabled: true },
        validation: {
          regex: "^\\+243[0-9]{9}$",
          example: "+243812345678"
        }
      },
      {
        name: "Orange Money",
        icon: "/icons/orange.svg",
        providerCode: "CD_ORANGE_MM",
        priority: 2,
        capabilities: { deposit: true, withdraw: true, piNetwork: true },
        rules: {
          minAmount: 1,
          maxAmount: 4000,
          feePercent: 1.7,
          processingTime: "Instant"
        },
        status: { enabled: true }
      },
      {
        name: "Airtel Money",
        icon: "/icons/airtel.svg",
        providerCode: "CD_AIRTEL_MM",
        priority: 3,
        capabilities: { deposit: true, withdraw: true, piNetwork: true },
        rules: {
          minAmount: 1,
          maxAmount: 3000,
          feePercent: 1.8,
          processingTime: "Instant"
        },
        status: { enabled: true }
      }
    ],
    banks: [
      {
        name: "Rawbank",
        swift: "RAWBCDKI",
        icon: "/banks/rawbank.svg",
        providerCode: "CD_RAWBANK",
        priority: 1,
        capabilities: { deposit: true, withdraw: true, piNetwork: false },
        rules: {
          minAmount: 10,
          maxAmount: 50000,
          feePercent: 1.2,
          processingTime: "24h"
        },
        status: { enabled: true },
        validation: {
          minLength: 8,
          maxLength: 20
        }
      },
      {
        name: "Trust Merchant Bank",
        swift: "TMBCCDKI",
        icon: "/banks/tmb.svg",
        providerCode: "CD_TMB",
        priority: 2,
        capabilities: { deposit: true, withdraw: true, piNetwork: false },
        rules: {
          minAmount: 10,
          maxAmount: 40000,
          feePercent: 1.3,
          processingTime: "24h"
        },
        status: { enabled: true }
      }
    ]
  },

  {
    code: "RW",
    name: "Rwanda",
    currency: "RWF",
    dialCode: "+250",
    piToLocalRate: 1200,
    exchangeSource: "manual",
    lastUpdated: "2025-12-21",
    flag: "/flags/rw.svg",
    compliance: {
      kycRequired: true,
      kycLevel: "basic",
      dailyLimit: 3000
    },
    mobileMoneyOperators: [
      {
        name: "MTN MoMo",
        icon: "/icons/mtn.svg",
        providerCode: "RW_MTN_MM",
        priority: 1,
        capabilities: { deposit: true, withdraw: true, piNetwork: true },
        rules: {
          minAmount: 1,
          maxAmount: 3000,
          feePercent: 1.4,
          processingTime: "Instant"
        },
        status: { enabled: true }
      }
    ],
    banks: [
      {
        name: "Bank of Kigali",
        swift: "BKIGRWRW",
        icon: "/banks/bk.svg",
        providerCode: "RW_BK",
        priority: 1,
        capabilities: { deposit: true, withdraw: true, piNetwork: false },
        rules: {
          minAmount: 20,
          maxAmount: 30000,
          feePercent: 1.1,
          processingTime: "24h"
        },
        status: { enabled: true }
      }
    ]
  }
];

// =============================
// Helpers
// =============================

export const getCountryByCode = (code: string) =>
  countries.find(c => c.code === code);

export const getMobileMoneyByCountry = (code: string) =>
  getCountryByCode(code)?.mobileMoneyOperators ?? [];

export const getBanksByCountry = (code: string) =>
  getCountryByCode(code)?.banks ?? [];
