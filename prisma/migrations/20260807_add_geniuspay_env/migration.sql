-- Environnement GeniusPay (Mobile Money) piloté depuis Admin > Réglages.
-- Valeurs : 'sandbox' | 'production'. Projeté dans process.env.GENIUSPAY_ENV
-- au runtime pour basculer testnet <-> mainnet sans redéploiement.
ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "geniuspayEnv" TEXT NOT NULL DEFAULT 'sandbox';
