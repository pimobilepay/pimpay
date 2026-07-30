-- Migration: Demande de paiement (PaymentRequest)
--
-- Un utilisateur cree une demande (montant + devise + note + expiration), puis
-- partage un lien / QR code base sur son `code` unique. N'importe quel autre
-- utilisateur possedant le lien peut la regler depuis son wallet.
--
-- `recipientId` est un destinataire cible optionnel : quand il est renseigne,
-- cet utilisateur recoit une notification l'invitant a regler la demande.
--
-- Cette migration est idempotente : elle cree la table si elle n'existe pas
-- encore (elle avait ete introduite via `prisma db push` sans migration) et
-- ajoute la colonne `recipientId` si la table existait deja.

-- 1. Enum de statut
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentRequestStatus') THEN
    CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "recipientId" TEXT,
  "payerId"     TEXT,
  "amount"      DOUBLE PRECISION NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'PI',
  "note"        TEXT,
  "status"      "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reference"   TEXT,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "paidAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- 3. Colonne recipientId (si la table preexistait)
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;

-- 4. Index
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRequest_code_key" ON "PaymentRequest"("code");
CREATE INDEX IF NOT EXISTS "PaymentRequest_requesterId_idx" ON "PaymentRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_recipientId_idx" ON "PaymentRequest"("recipientId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- 5. Cles etrangeres
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRequest_requesterId_fkey'
  ) THEN
    ALTER TABLE "PaymentRequest"
      ADD CONSTRAINT "PaymentRequest_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRequest_recipientId_fkey'
  ) THEN
    ALTER TABLE "PaymentRequest"
      ADD CONSTRAINT "PaymentRequest_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRequest_payerId_fkey'
  ) THEN
    ALTER TABLE "PaymentRequest"
      ADD CONSTRAINT "PaymentRequest_payerId_fkey"
      FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
