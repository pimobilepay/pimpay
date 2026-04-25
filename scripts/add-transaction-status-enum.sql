-- Migration: Ajouter les nouveaux statuts de transaction
-- Date: 2024
-- Description: Ajoute PENDING_CONFIRMATION, EXPIRED, REJECTED a l'enum TransactionStatus

-- PostgreSQL: Ajouter les nouvelles valeurs a l'enum existant
-- Note: PostgreSQL ne permet pas de modifier directement un enum,
-- donc on utilise ALTER TYPE ... ADD VALUE

-- Ajouter PENDING_CONFIRMATION si n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_CONFIRMATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionStatus')) THEN
        ALTER TYPE "TransactionStatus" ADD VALUE 'PENDING_CONFIRMATION';
    END IF;
END $$;

-- Ajouter EXPIRED si n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPIRED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionStatus')) THEN
        ALTER TYPE "TransactionStatus" ADD VALUE 'EXPIRED';
    END IF;
END $$;

-- Ajouter REJECTED si n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REJECTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionStatus')) THEN
        ALTER TYPE "TransactionStatus" ADD VALUE 'REJECTED';
    END IF;
END $$;

-- Verification
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionStatus');
