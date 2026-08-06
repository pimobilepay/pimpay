-- CAISSE AGENT SEPAREE DU WALLET PERSONNEL
-- Cree la table AgentFloat : une ligne par agent et par devise de caisse.
-- Aucune donnee existante n'est modifiee : les wallets personnels restent intacts.

CREATE TABLE IF NOT EXISTS "AgentFloat" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "currency"  TEXT NOT NULL DEFAULT 'XAF',
  "balance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reserved"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentFloat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentFloat_userId_currency_key"
  ON "AgentFloat" ("userId", "currency");

CREATE INDEX IF NOT EXISTS "AgentFloat_userId_idx"
  ON "AgentFloat" ("userId");

DO $$
BEGIN
  ALTER TABLE "AgentFloat"
    ADD CONSTRAINT "AgentFloat_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Initialise une caisse a 0 dans la devise par defaut pour chaque agent existant.
-- L'administration recredite ensuite les floats depuis Admin > Agents > Float.
INSERT INTO "AgentFloat" ("id", "userId", "currency", "balance", "reserved", "createdAt", "updatedAt")
SELECT
  'aflt_' || md5(u."id" || ':XAF'),
  u."id",
  'XAF',
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'AGENT'
ON CONFLICT ("userId", "currency") DO NOTHING;
