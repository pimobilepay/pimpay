-- Add balanceUSD and balanceEUR columns to VirtualCard table
-- Each card will have its own independent balance

ALTER TABLE "VirtualCard" ADD COLUMN IF NOT EXISTS "balanceUSD" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "VirtualCard" ADD COLUMN IF NOT EXISTS "balanceEUR" DOUBLE PRECISION DEFAULT 0;

-- Set default values for existing cards
UPDATE "VirtualCard" SET "balanceUSD" = 0 WHERE "balanceUSD" IS NULL;
UPDATE "VirtualCard" SET "balanceEUR" = 0 WHERE "balanceEUR" IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE "VirtualCard" ALTER COLUMN "balanceUSD" SET NOT NULL;
ALTER TABLE "VirtualCard" ALTER COLUMN "balanceEUR" SET NOT NULL;
ALTER TABLE "VirtualCard" ALTER COLUMN "balanceUSD" SET DEFAULT 0;
ALTER TABLE "VirtualCard" ALTER COLUMN "balanceEUR" SET DEFAULT 0;
