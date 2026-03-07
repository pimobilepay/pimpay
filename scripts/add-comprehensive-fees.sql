-- Add comprehensive fee columns to SystemConfig
-- This migration adds new fee types for crypto, fiat, and payment transactions

-- Crypto Fees
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "depositCryptoFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01;

-- Fiat Fees (new columns only - depositMobileFee and depositCardFee already exist)
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "withdrawMobileFee" DOUBLE PRECISION NOT NULL DEFAULT 0.025;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "withdrawBankFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02;

-- Payment Fees (cardPaymentFee already exists)
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "merchantPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "billPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.015;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "qrPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01;

-- Initialize the new columns for the GLOBAL_CONFIG row
UPDATE "SystemConfig"
SET
  "depositCryptoFee" = 0.01,
  "withdrawMobileFee" = COALESCE("withdrawFee", 0.02) + 0.005,
  "withdrawBankFee" = COALESCE("withdrawFee", 0.02),
  "merchantPaymentFee" = 0.02,
  "billPaymentFee" = 0.015,
  "qrPaymentFee" = 0.01
WHERE id = 'GLOBAL_CONFIG';
