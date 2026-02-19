-- Add sourceCurrency column to SwapQuote table (with default for existing rows)
ALTER TABLE "SwapQuote" ADD COLUMN IF NOT EXISTS "sourceCurrency" TEXT NOT NULL DEFAULT 'USDT';
