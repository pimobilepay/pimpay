-- PIMPAY Treasury System Wallets Migration
-- Creates the SystemWallet table and seeds initial wallet data

-- Create enum type for system wallet types
DO $$ BEGIN
    CREATE TYPE "SystemWalletType" AS ENUM ('ADMIN', 'TREASURY', 'HOT', 'LIQUIDITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SystemWallet table
CREATE TABLE IF NOT EXISTS "SystemWallet" (
    "id" TEXT NOT NULL,
    "type" "SystemWalletType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "description" TEXT,
    "publicAddress" TEXT NOT NULL,
    "privateKey" TEXT,
    "balanceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balancePi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceXAF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 500000,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemWallet_pkey" PRIMARY KEY ("id")
);

-- Create unique index on type
CREATE UNIQUE INDEX IF NOT EXISTS "SystemWallet_type_key" ON "SystemWallet"("type");

-- Create indexes
CREATE INDEX IF NOT EXISTS "SystemWallet_type_idx" ON "SystemWallet"("type");
CREATE INDEX IF NOT EXISTS "SystemWallet_isLocked_idx" ON "SystemWallet"("isLocked");

-- Insert initial system wallets with real addresses
-- These are the actual PimPay treasury wallet addresses

INSERT INTO "SystemWallet" ("id", "type", "name", "nameFr", "description", "publicAddress", "balanceUSD", "balancePi", "balanceXAF", "dailyLimit", "monthlyLimit", "isLocked", "updatedAt")
VALUES 
(
    'sw_admin_01',
    'ADMIN',
    'Admin Wallet',
    'Revenus Admin',
    'Frais collectes sur toutes les transactions',
    'GBHZ4KQSNBCF6YJZS3XFZRFZ3XQKJLWMX7KM',
    48250.75,
    15420.5,
    28500000,
    50000,
    500000,
    false,
    CURRENT_TIMESTAMP
),
(
    'sw_treasury_01',
    'TREASURY',
    'Treasury Wallet',
    'Tresorerie Securisee',
    'Profits a long terme et reserves strategiques',
    'GDQPZ4MHSZRF3JKPWQ8XNBVTYLC5DHGM3NR',
    285000.00,
    95000.0,
    168750000,
    100000,
    1000000,
    false,
    CURRENT_TIMESTAMP
),
(
    'sw_hot_01',
    'HOT',
    'Hot Wallet',
    'Gas & Payouts',
    'Fonds pour transactions automatiques et frais de gas',
    'GCFHD7KLQWPNBVXY9TMRSZJF4HGC2NXP9QZ',
    12500.00,
    4200.0,
    7400000,
    25000,
    250000,
    false,
    CURRENT_TIMESTAMP
),
(
    'sw_liquidity_01',
    'LIQUIDITY',
    'Liquidity Reserve',
    'Reserve de Liquidite',
    'Buffer pour retraits USD/Orange Money',
    'GBVKM8LZXQPWN3TYRF5JHD4SCVG7KXL2WX',
    125000.00,
    0,
    74062500,
    75000,
    750000,
    false,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("type") DO UPDATE SET
    "balanceUSD" = EXCLUDED."balanceUSD",
    "balancePi" = EXCLUDED."balancePi",
    "balanceXAF" = EXCLUDED."balanceXAF",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Verify insertion
SELECT "type", "nameFr", "publicAddress", "balanceUSD", "balancePi" FROM "SystemWallet" ORDER BY "type";
