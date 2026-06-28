-- [IDS] Nouveaux systèmes de détection : bots/scrapers + en-têtes falsifiés
-- et ajustement du seuil de risque par défaut (anti faux positifs).

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockBots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockHeaderSpoof" BOOLEAN NOT NULL DEFAULT false;

-- Nouveau seuil par défaut plus équilibré (75) pour les nouvelles installations.
ALTER TABLE "SystemConfig" ALTER COLUMN "riskScoreThreshold" SET DEFAULT 75;
