-- Migration: Add PIN version tracking for 4-digit to 6-digit migration
-- This allows tracking which users need to upgrade their PIN

-- Add pinVersion column (1 = legacy 4-digit, 2 = new 6-digit)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinVersion" INTEGER DEFAULT 1;

-- Add pinUpdatedAt column to track when PIN was last updated
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinUpdatedAt" TIMESTAMP(3);

-- Set pinVersion = 1 for all existing users with a PIN (they need to migrate)
UPDATE "User" SET "pinVersion" = 1 WHERE "pin" IS NOT NULL AND "pinVersion" IS NULL;

-- Create index for faster queries on pin migration status
CREATE INDEX IF NOT EXISTS "User_pinVersion_idx" ON "User"("pinVersion") WHERE "pin" IS NOT NULL;
