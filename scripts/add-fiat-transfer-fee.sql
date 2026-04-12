-- Migration: Add fiatTransferFee column to SystemConfig table
-- This column stores the fee rate for fiat P2P transfers (XAF, EUR, USD, etc.)
-- Default value: 0.005 (0.5%)

ALTER TABLE "SystemConfig" 
ADD COLUMN IF NOT EXISTS "fiatTransferFee" DOUBLE PRECISION NOT NULL DEFAULT 0.005;
