-- Add granular fee columns to SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "withdrawFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "depositMobileFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "depositCardFee" DOUBLE PRECISION NOT NULL DEFAULT 0.035;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "exchangeFee" DOUBLE PRECISION NOT NULL DEFAULT 0.001;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "cardPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.015;

-- Initialize the new columns from the existing transactionFee value for the GLOBAL_CONFIG row
UPDATE "SystemConfig"
SET
  "transferFee" = COALESCE("transactionFee", 0.01),
  "withdrawFee" = COALESCE("transactionFee", 0.01)
WHERE id = 'GLOBAL_CONFIG';
