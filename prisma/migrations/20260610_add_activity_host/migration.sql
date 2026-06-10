-- Migration: Add host/origin tracking to UserActivity
-- Identifies which domain/sub-domain of the Pi ecosystem (and Vercel deployment)
-- a user is connecting from, so the admin analytics can attribute traffic per server.

ALTER TABLE "UserActivity" ADD COLUMN IF NOT EXISTS "host" TEXT;
ALTER TABLE "UserActivity" ADD COLUMN IF NOT EXISTS "origin" TEXT;

CREATE INDEX IF NOT EXISTS "UserActivity_host_idx" ON "UserActivity"("host");
