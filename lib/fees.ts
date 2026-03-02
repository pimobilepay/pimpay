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
  /** P2P / internal transfer fee rate */
  transferFee: number;
  /** Withdrawal fee rate */
  withdrawFee: number;
  /** Mobile money deposit fee rate */
  depositMobileFee: number;
  /** Card deposit fee rate */
  depositCardFee: number;
  /** Crypto exchange / swap fee rate */
  exchangeFee: number;
  /** Virtual card payment fee rate */
  cardPaymentFee: number;
  /** Min withdrawal amount */
  minWithdrawal: number;
  /** Max withdrawal amount */
  maxWithdrawal: number;
}

export type FeeType =
  | "transfer"
  | "withdraw"
  | "deposit_mobile"
  | "deposit_card"
  | "exchange"
  | "card_payment";

/* ------------------------------------------------------------------ */
/*  DEFAULTS (mirrors Prisma schema @default values)                   */
/* ------------------------------------------------------------------ */

const DEFAULT_FEE_CONFIG: FeeConfig = {
  transactionFee: 0.01,
  transferFee: 0.01,
  withdrawFee: 0.02,
  depositMobileFee: 0.02,
  depositCardFee: 0.035,
  exchangeFee: 0.001,
  cardPaymentFee: 0.015,
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
        transferFee: true,
        withdrawFee: true,
        depositMobileFee: true,
        depositCardFee: true,
        exchangeFee: true,
        cardPaymentFee: true,
        minWithdrawal: true,
        maxWithdrawal: true,
      },
    });

    if (!config) return { ...DEFAULT_FEE_CONFIG };

    return {
      transactionFee: config.transactionFee ?? DEFAULT_FEE_CONFIG.transactionFee,
      transferFee: config.transferFee ?? DEFAULT_FEE_CONFIG.transferFee,
      withdrawFee: config.withdrawFee ?? DEFAULT_FEE_CONFIG.withdrawFee,
      depositMobileFee: config.depositMobileFee ?? DEFAULT_FEE_CONFIG.depositMobileFee,
      depositCardFee: config.depositCardFee ?? DEFAULT_FEE_CONFIG.depositCardFee,
      exchangeFee: config.exchangeFee ?? DEFAULT_FEE_CONFIG.exchangeFee,
      cardPaymentFee: config.cardPaymentFee ?? DEFAULT_FEE_CONFIG.cardPaymentFee,
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
    case "transfer":
      return config.transferFee;
    case "withdraw":
      return config.withdrawFee;
    case "deposit_mobile":
      return config.depositMobileFee;
    case "deposit_card":
      return config.depositCardFee;
    case "exchange":
      return config.exchangeFee;
    case "card_payment":
      return config.cardPaymentFee;
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
