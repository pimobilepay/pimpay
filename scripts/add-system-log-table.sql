-- Create LogLevel enum if not exists
DO $$ BEGIN
    CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SystemLog table
CREATE TABLE IF NOT EXISTS "SystemLog" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "requestId" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX IF NOT EXISTS "SystemLog_source_idx" ON "SystemLog"("source");
CREATE INDEX IF NOT EXISTS "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
CREATE INDEX IF NOT EXISTS "SystemLog_userId_idx" ON "SystemLog"("userId");

-- Insert some initial test logs to verify the system works
INSERT INTO "SystemLog" ("id", "level", "source", "action", "message", "details", "createdAt")
VALUES 
    (gen_random_uuid()::text, 'INFO', 'SYSTEM', 'MIGRATION', 'Table SystemLog creee avec succes', '{"version": "1.0"}', NOW()),
    (gen_random_uuid()::text, 'INFO', 'SYSTEM', 'STARTUP', 'Systeme de logs initialise', NULL, NOW());
