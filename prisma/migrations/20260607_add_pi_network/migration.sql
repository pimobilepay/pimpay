-- Migration: Add piNetwork column to SystemConfig
-- Allows persisting the active Pi network (testnet | mainnet) in the database
-- so it can be switched at runtime without a redeploy.

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "piNetwork" TEXT NOT NULL DEFAULT 'testnet';
