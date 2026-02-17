-- Add usdtAddress and usdtPrivateKey columns to User table if they don't exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usdtAddress" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usdtPrivateKey" TEXT;
