-- Add logo field to Business table
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "logo" TEXT;
