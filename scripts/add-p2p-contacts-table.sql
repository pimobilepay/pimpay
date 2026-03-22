-- Create P2PContact table
CREATE TABLE IF NOT EXISTS "P2PContact" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("contactId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE("userId", "contactId")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "P2PContact_userId_idx" ON "P2PContact"("userId");
CREATE INDEX IF NOT EXISTS "P2PContact_contactId_idx" ON "P2PContact"("contactId");
CREATE INDEX IF NOT EXISTS "P2PContact_isFavorite_idx" ON "P2PContact"("isFavorite");
