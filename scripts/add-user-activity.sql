-- Create UserActivity table for tracking user page visits
CREATE TABLE IF NOT EXISTS "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'PAGE_VIEW',
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "UserActivity_userId_idx" ON "UserActivity"("userId");
CREATE INDEX IF NOT EXISTS "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "UserActivity_page_idx" ON "UserActivity"("page");

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'UserActivity_userId_fkey'
    ) THEN
        ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
