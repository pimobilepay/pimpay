/**
 * CENTRALIZED FEE MANAGEMENT - PimPay
 *
 * Single source of truth for all transaction fees.
 * Every API route must call `getFeeConfig()` then use the appropriate rate
 * instead of hardcoding fee values.
 */

import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export interface FeeConfig {
  /** Generic / legacy transaction fee (kept for backward compat) */
  transactionFee: number;
  
  // Crypto Fees
  /** P2P / internal crypto transfer fee rate */
  transferFee: number;
  /** Crypto withdrawal fee rate */
  withdrawFee: number;
  /** Crypto deposit fee rate */
  depositCryptoFee: number;
  /** Crypto exchange / swap fee rate */
  exchangeFee: number;
  
  // Fiat Fees
  /** Mobile money deposit fee rate */
  depositMobileFee: number;
  /** Card deposit fee rate */
  depositCardFee: number;
  /** Mobile money withdrawal fee rate */
  withdrawMobileFee: number;
  /** Bank withdrawal fee rate */
  withdrawBankFee: number;
  
  // Payment Fees
  /** Virtual card payment fee rate */
  cardPaymentFee: number;
  /** Merchant payment fee rate */
  merchantPaymentFee: number;
  /** Bill payment fee rate */
  billPaymentFee: number;
  /** QR code payment fee rate */
  qrPaymentFee: number;
  
  /** Min withdrawal amount */
  minWithdrawal: number;
  /** Max withdrawal amount */
  maxWithdrawal: number;
}

export type FeeType =
  // Crypto
  | "transfer"
  | "withdraw"
  | "deposit"
  | "deposit_crypto"
  | "exchange"
  // Fiat
  | "deposit_mobile"
  | "deposit_card"
  | "withdraw_mobile"
  | "withdraw_bank"
  // Payments
  | "card_payment"
  | "merchant_payment"
  | "bill_payment"
  | "qr_payment";

/* ------------------------------------------------------------------ */
/*  DEFAULTS (mirrors Prisma schema @default values)                   */
/* ------------------------------------------------------------------ */

const DEFAULT_FEE_CONFIG: FeeConfig = {
  transactionFee: 0.01,
  // Crypto Fees
  transferFee: 0.01,
  withdrawFee: 0.02,
  depositCryptoFee: 0.01,
  exchangeFee: 0.001,
  // Fiat Fees
  depositMobileFee: 0.02,
  depositCardFee: 0.035,
  withdrawMobileFee: 0.025,
  withdrawBankFee: 0.02,
  // Payment Fees
  cardPaymentFee: 0.015,
  merchantPaymentFee: 0.02,
  billPaymentFee: 0.015,
  qrPaymentFee: 0.01,
  // Limits
  minWithdrawal: 1.0,
  maxWithdrawal: 5000.0,
};

/* ------------------------------------------------------------------ */
/*  CORE HELPERS                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fetches the fee configuration from SystemConfig.
 * Falls back to safe defaults when the database is unreachable.
 */
export async function getFeeConfig(): Promise<FeeConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: {
        transactionFee: true,
        // Crypto Fees
        transferFee: true,
        withdrawFee: true,
        depositCryptoFee: true,
        exchangeFee: true,
        // Fiat Fees
        depositMobileFee: true,
        depositCardFee: true,
        withdrawMobileFee: true,
        withdrawBankFee: true,
        // Payment Fees
        cardPaymentFee: true,
        merchantPaymentFee: true,
        billPaymentFee: true,
        qrPaymentFee: true,
        // Limits
        minWithdrawal: true,
        maxWithdrawal: true,
      },
    });

    if (!config) return { ...DEFAULT_FEE_CONFIG };

    return {
      transactionFee: config.transactionFee ?? DEFAULT_FEE_CONFIG.transactionFee,
      // Crypto Fees
      transferFee: config.transferFee ?? DEFAULT_FEE_CONFIG.transferFee,
      withdrawFee: config.withdrawFee ?? DEFAULT_FEE_CONFIG.withdrawFee,
      depositCryptoFee: config.depositCryptoFee ?? DEFAULT_FEE_CONFIG.depositCryptoFee,
      exchangeFee: config.exchangeFee ?? DEFAULT_FEE_CONFIG.exchangeFee,
      // Fiat Fees
      depositMobileFee: config.depositMobileFee ?? DEFAULT_FEE_CONFIG.depositMobileFee,
      depositCardFee: config.depositCardFee ?? DEFAULT_FEE_CONFIG.depositCardFee,
      withdrawMobileFee: config.withdrawMobileFee ?? DEFAULT_FEE_CONFIG.withdrawMobileFee,
      withdrawBankFee: config.withdrawBankFee ?? DEFAULT_FEE_CONFIG.withdrawBankFee,
      // Payment Fees
      cardPaymentFee: config.cardPaymentFee ?? DEFAULT_FEE_CONFIG.cardPaymentFee,
      merchantPaymentFee: config.merchantPaymentFee ?? DEFAULT_FEE_CONFIG.merchantPaymentFee,
      billPaymentFee: config.billPaymentFee ?? DEFAULT_FEE_CONFIG.billPaymentFee,
      qrPaymentFee: config.qrPaymentFee ?? DEFAULT_FEE_CONFIG.qrPaymentFee,
      // Limits
      minWithdrawal: config.minWithdrawal ?? DEFAULT_FEE_CONFIG.minWithdrawal,
      maxWithdrawal: config.maxWithdrawal ?? DEFAULT_FEE_CONFIG.maxWithdrawal,
    };
  } catch (error) {
    console.error("[FEES] Failed to load fee config:", error);
    return { ...DEFAULT_FEE_CONFIG };
  }
}

/**
 * Returns the correct fee rate for the given transaction type.
 */
export function getFeeRate(config: FeeConfig, type: FeeType): number {
  switch (type) {
    // Crypto Fees
    case "transfer":
      return config.transferFee;
    case "withdraw":
      return config.withdrawFee;
    case "deposit":
      return config.depositMobileFee; // Default deposit fee
    case "deposit_crypto":
      return config.depositCryptoFee;
    case "exchange":
      return config.exchangeFee;
    // Fiat Fees
    case "deposit_mobile":
      return config.depositMobileFee;
    case "deposit_card":
      return config.depositCardFee;
    case "withdraw_mobile":
      return config.withdrawMobileFee;
    case "withdraw_bank":
      return config.withdrawBankFee;
    // Payment Fees
    case "card_payment":
      return config.cardPaymentFee;
    case "merchant_payment":
      return config.merchantPaymentFee;
    case "bill_payment":
      return config.billPaymentFee;
    case "qr_payment":
      return config.qrPaymentFee;
    default:
      return config.transactionFee;
  }
}

/**
 * Calculates the fee amount for a given transaction.
 * Returns { feeRate, feeAmount, totalDebit } where totalDebit = amount + feeAmount.
 */
export function calculateFee(
  amount: number,
  config: FeeConfig,
  type: FeeType
): { feeRate: number; feeAmount: number; totalDebit: number } {
  const feeRate = getFeeRate(config, type);
  const feeAmount = Math.round(amount * feeRate * 100) / 100;
  return {
    feeRate,
    feeAmount,
    totalDebit: amount + feeAmount,
  };
}
