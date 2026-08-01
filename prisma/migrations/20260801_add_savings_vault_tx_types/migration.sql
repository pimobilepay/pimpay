-- Épargne + Coffre-fort : migration additive uniquement.
-- Aucune colonne supprimée, aucun renommage : sûre à rejouer sur la base de production.

-- 1. Nouveaux types de transaction pour la traçabilité au grand livre.
--    ALTER TYPE ... ADD VALUE est autorisé dans une transaction sur PostgreSQL >= 12
--    tant que la nouvelle valeur n'est pas utilisée dans la même transaction.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'SAVINGS_DEPOSIT';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'SAVINGS_WITHDRAW';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'VAULT_LOCK';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'VAULT_UNLOCK';

-- 2. Index composites pour le listing filtré (« mes comptes actifs »).
CREATE INDEX IF NOT EXISTS "SavingsAccount_userId_status_idx"
  ON "SavingsAccount" ("userId", "status");

CREATE INDEX IF NOT EXISTS "Vault_userId_status_idx"
  ON "Vault" ("userId", "status");
