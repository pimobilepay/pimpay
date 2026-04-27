/**
 * AUTO FEE CONVERSION SERVICE - PimPay
 *
 * Converts all platform fees automatically to Pi after each successful transaction.
 * This runs in the background without admin intervention.
 */

import { prisma } from "@/lib/prisma";
import { PI_CONSENSUS_RATE, FIAT_RATES, convert } from "@/lib/exchange";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export interface ConversionResult {
  success: boolean;
  originalAmount: number;
  originalCurrency: string;
  convertedPi: number;
  conversionRate: number;
  transactionRef: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

// Admin wallet address for centralized fee collection
const ADMIN_WALLET_ID = "admin_treasury";
const SYSTEM_USER_ID = "system";

// Conversion is triggered for fees above this threshold (in USD equivalent)
const MIN_CONVERSION_THRESHOLD_USD = 0.001; // Very low to capture all fees

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/**
 * Get the admin treasury wallet for PI
 */
async function getOrCreateAdminPiWallet() {
  let adminWallet = await prisma.wallet.findFirst({
    where: {
      OR: [
        { userId: ADMIN_WALLET_ID },
        { userId: SYSTEM_USER_ID },
        { type: "ADMIN" },
      ],
      currency: "PI",
    },
  });

  // If no admin wallet exists, find or create system user and wallet
  if (!adminWallet) {
    // Try to find any system/admin wallet
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
    });

    const adminUserId = (systemConfig as any)?.adminWalletAddress || SYSTEM_USER_ID;

    // Try to find wallet by admin user ID
    adminWallet = await prisma.wallet.findFirst({
      where: {
        userId: adminUserId,
        currency: "PI",
      },
    });

    if (!adminWallet) {
      // Create a system wallet for fee collection
      try {
        adminWallet = await prisma.wallet.create({
          data: {
            userId: SYSTEM_USER_ID,
            currency: "PI",
            type: "ADMIN",
            balance: 0,
          },
        });
      } catch {
        // Wallet might already exist, try to fetch it
        adminWallet = await prisma.wallet.findFirst({
          where: { currency: "PI", type: "ADMIN" },
        });
      }
    }
  }

  return adminWallet;
}

/**
 * Convert any currency amount to PI using current rates
 */
function convertToPi(amount: number, currency: string): number {
  if (currency === "PI") return amount;

  // Use the convert function from exchange.ts
  const piAmount = convert(currency, "PI", amount);
  return piAmount;
}

/**
 * Get conversion rate from currency to PI
 */
function getConversionRate(currency: string): number {
  if (currency === "PI") return 1;

  // For fiat currencies
  if (FIAT_RATES[currency]) {
    // 1 PI = PI_CONSENSUS_RATE USD
    // 1 USD = FIAT_RATES[currency] of that currency
    // So: 1 currency = 1 / FIAT_RATES[currency] USD = (1 / FIAT_RATES[currency]) / PI_CONSENSUS_RATE PI
    return 1 / (FIAT_RATES[currency] * PI_CONSENSUS_RATE);
  }

  // For unknown currencies, assume USD equivalent
  return 1 / PI_CONSENSUS_RATE;
}

/* ------------------------------------------------------------------ */
/*  MAIN CONVERSION FUNCTION                                           */
/* ------------------------------------------------------------------ */

/**
 * Automatically converts a transaction fee to Pi and credits the admin treasury.
 * This should be called after every successful transaction.
 *
 * @param feeAmount - The fee amount collected
 * @param feeCurrency - The currency of the fee (PI, USD, XAF, etc.)
 * @param transactionId - The original transaction ID
 * @param transactionRef - The original transaction reference
 */
export async function autoConvertFeeToPi(
  feeAmount: number,
  feeCurrency: string,
  transactionId: string,
  transactionRef: string
): Promise<ConversionResult> {
  // Skip if no fee or fee is already in PI
  if (!feeAmount || feeAmount <= 0) {
    return {
      success: true,
      originalAmount: 0,
      originalCurrency: feeCurrency,
      convertedPi: 0,
      conversionRate: 0,
      transactionRef,
    };
  }

  try {
    // Calculate USD equivalent for threshold check
    let usdEquivalent = feeAmount;
    if (feeCurrency !== "USD") {
      if (feeCurrency === "PI") {
        usdEquivalent = feeAmount * PI_CONSENSUS_RATE;
      } else if (FIAT_RATES[feeCurrency]) {
        usdEquivalent = feeAmount / FIAT_RATES[feeCurrency];
      }
    }

    // Skip if below threshold
    if (usdEquivalent < MIN_CONVERSION_THRESHOLD_USD) {
      return {
        success: true,
        originalAmount: feeAmount,
        originalCurrency: feeCurrency,
        convertedPi: 0,
        conversionRate: 0,
        transactionRef,
        error: "Below minimum threshold",
      };
    }

    // Get admin wallet
    const adminWallet = await getOrCreateAdminPiWallet();
    if (!adminWallet) {
      console.error("[AUTO_FEE_CONVERT] Admin wallet not found");
      return {
        success: false,
        originalAmount: feeAmount,
        originalCurrency: feeCurrency,
        convertedPi: 0,
        conversionRate: 0,
        transactionRef,
        error: "Admin wallet not found",
      };
    }

    // Convert fee to PI
    const piAmount = feeCurrency === "PI" ? feeAmount : convertToPi(feeAmount, feeCurrency);
    const conversionRate = getConversionRate(feeCurrency);

    // Round to 8 decimal places for precision
    const roundedPiAmount = Math.round(piAmount * 100000000) / 100000000;

    if (roundedPiAmount <= 0) {
      return {
        success: true,
        originalAmount: feeAmount,
        originalCurrency: feeCurrency,
        convertedPi: 0,
        conversionRate,
        transactionRef,
        error: "Converted amount too small",
      };
    }

    // Atomic transaction to credit admin wallet and record conversion
    await prisma.$transaction(async (tx) => {
      // Credit admin wallet with converted PI
      await tx.wallet.update({
        where: { id: adminWallet.id },
        data: { balance: { increment: roundedPiAmount } },
      });

      // Record the fee conversion as a system transaction
      await tx.transaction.create({
        data: {
          reference: `FEE-CONV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: roundedPiAmount,
          netAmount: roundedPiAmount,
          currency: "PI",
          type: "FEE_CONVERSION",
          status: "SUCCESS",
          fromUserId: SYSTEM_USER_ID,
          toUserId: adminWallet.userId,
          toWalletId: adminWallet.id,
          fee: 0,
          description: `Auto-conversion frais: ${feeAmount.toFixed(8)} ${feeCurrency} -> ${roundedPiAmount.toFixed(8)} PI`,
          metadata: {
            originalFee: feeAmount,
            originalCurrency: feeCurrency,
            convertedPi: roundedPiAmount,
            conversionRate: conversionRate,
            sourceTransactionId: transactionId,
            sourceTransactionRef: transactionRef,
            convertedAt: new Date().toISOString(),
            autoConverted: true,
          },
        },
      });
    });

    console.log(
      `[AUTO_FEE_CONVERT] Success: ${feeAmount} ${feeCurrency} -> ${roundedPiAmount} PI (Ref: ${transactionRef})`
    );

    return {
      success: true,
      originalAmount: feeAmount,
      originalCurrency: feeCurrency,
      convertedPi: roundedPiAmount,
      conversionRate,
      transactionRef,
    };
  } catch (error: any) {
    console.error("[AUTO_FEE_CONVERT] Error:", error.message);
    return {
      success: false,
      originalAmount: feeAmount,
      originalCurrency: feeCurrency,
      convertedPi: 0,
      conversionRate: 0,
      transactionRef,
      error: error.message,
    };
  }
}

/**
 * Batch convert accumulated fees (for cleanup or manual trigger)
 * This can be called periodically to ensure all fees are converted
 */
export async function batchConvertPendingFees(): Promise<{
  processed: number;
  converted: number;
  totalPi: number;
  errors: number;
}> {
  let processed = 0;
  let converted = 0;
  let totalPi = 0;
  let errors = 0;

  try {
    // Find transactions with fees that haven't been converted yet
    const transactionsWithFees = await prisma.transaction.findMany({
      where: {
        fee: { gt: 0 },
        status: "SUCCESS",
        type: { notIn: ["FEE_CONVERSION"] },
        // Check if no conversion exists for this transaction
        NOT: {
          reference: {
            startsWith: "FEE-CONV-",
          },
        },
      },
      select: {
        id: true,
        reference: true,
        fee: true,
        currency: true,
      },
      take: 100, // Process in batches
      orderBy: { createdAt: "desc" },
    });

    for (const tx of transactionsWithFees) {
      processed++;

      // Check if already converted
      const existingConversion = await prisma.transaction.findFirst({
        where: {
          type: "FEE_CONVERSION",
          metadata: {
            path: ["sourceTransactionId"],
            equals: tx.id,
          },
        },
      });

      if (existingConversion) {
        continue; // Skip already converted
      }

      const result = await autoConvertFeeToPi(
        tx.fee || 0,
        tx.currency,
        tx.id,
        tx.reference
      );

      if (result.success && result.convertedPi > 0) {
        converted++;
        totalPi += result.convertedPi;
      } else if (!result.success) {
        errors++;
      }
    }
  } catch (error: any) {
    console.error("[BATCH_FEE_CONVERT] Error:", error.message);
  }

  return { processed, converted, totalPi, errors };
}
