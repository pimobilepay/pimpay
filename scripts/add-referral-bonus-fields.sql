-- Add referral bonus fields to SystemConfig table
-- These fields allow admin to configure referral program rewards

-- Add referralBonus field (bonus for the referrer)
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "referralBonus" DOUBLE PRECISION DEFAULT 0.0005;

-- Add referralWelcomeBonus field (bonus for the new user being referred)
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "referralWelcomeBonus" DOUBLE PRECISION DEFAULT 0.00025;

-- Update existing GLOBAL_CONFIG record with default values if they are null
UPDATE "SystemConfig" 
SET 
  "referralBonus" = COALESCE("referralBonus", 0.0005),
  "referralWelcomeBonus" = COALESCE("referralWelcomeBonus", 0.00025)
WHERE id = 'GLOBAL_CONFIG';
