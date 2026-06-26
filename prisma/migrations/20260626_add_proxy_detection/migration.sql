-- [IDS] Détection proxy/VPN : réglages de défense + journal de détections

-- Réglages de défense ajoutés au singleton SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "proxyDetectionEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "proxyDetectionMode" TEXT NOT NULL DEFAULT 'BLOCK';
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockVpn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockProxy" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockTor" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "blockDatacenter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "riskScoreThreshold" INTEGER NOT NULL DEFAULT 70;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "ipWhitelist" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "autoBlockOnDetection" BOOLEAN NOT NULL DEFAULT false;

-- Journal des détections de proxy/VPN/Tor
CREATE TABLE IF NOT EXISTS "ProxyDetection" (
  "id"           TEXT NOT NULL,
  "ip"           TEXT NOT NULL,
  "isProxy"      BOOLEAN NOT NULL DEFAULT false,
  "isVpn"        BOOLEAN NOT NULL DEFAULT false,
  "isTor"        BOOLEAN NOT NULL DEFAULT false,
  "isDatacenter" BOOLEAN NOT NULL DEFAULT false,
  "proxyType"    TEXT,
  "riskScore"    INTEGER NOT NULL DEFAULT 0,
  "country"      TEXT,
  "countryCode"  TEXT,
  "isp"          TEXT,
  "provider"     TEXT,
  "action"       TEXT NOT NULL DEFAULT 'LOGGED',
  "context"      TEXT,
  "userId"       TEXT,
  "userAgent"    TEXT,
  "source"       TEXT NOT NULL DEFAULT 'api',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProxyDetection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProxyDetection_ip_idx" ON "ProxyDetection"("ip");
CREATE INDEX IF NOT EXISTS "ProxyDetection_action_idx" ON "ProxyDetection"("action");
CREATE INDEX IF NOT EXISTS "ProxyDetection_createdAt_idx" ON "ProxyDetection"("createdAt");
CREATE INDEX IF NOT EXISTS "ProxyDetection_riskScore_idx" ON "ProxyDetection"("riskScore");
