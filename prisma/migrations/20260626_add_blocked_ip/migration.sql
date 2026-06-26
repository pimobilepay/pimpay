-- Migration: Add BlockedIp table for the intrusion detection journal
-- Stores IP addresses that an admin has "riposted" against (blocked) from the
-- security console. The login / auth flow checks this table to reject requests
-- coming from a blocked source. This is a defensive (active-defense) measure
-- only: it blocks inbound traffic, it never launches any outbound action.

CREATE TABLE IF NOT EXISTS "BlockedIp" (
  "id"        TEXT NOT NULL,
  "ip"        TEXT NOT NULL,
  "reason"    TEXT,
  "threat"    TEXT,
  "blockedBy" TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "hits"      INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlockedIp_ip_key" ON "BlockedIp"("ip");
CREATE INDEX IF NOT EXISTS "BlockedIp_ip_idx" ON "BlockedIp"("ip");
CREATE INDEX IF NOT EXISTS "BlockedIp_active_idx" ON "BlockedIp"("active");
