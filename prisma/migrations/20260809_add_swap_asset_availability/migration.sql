-- DISPONIBILITE DES ACTIFS AU SWAP (PI / SDA)
-- Deux interrupteurs pilotes depuis Admin > Reglages > Apercu.
-- Valeur par defaut = true : aucun changement de comportement a la migration.

ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "swapPiEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "swapSdaEnabled" BOOLEAN NOT NULL DEFAULT true;
