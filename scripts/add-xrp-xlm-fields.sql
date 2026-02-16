-- Add XRP fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xrpAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xrpSecret" TEXT;

-- Add XLM fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xlmAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xlmSecret" TEXT;

-- Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_xrpAddress_key" ON "User"("xrpAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "User_xlmAddress_key" ON "User"("xlmAddress");
