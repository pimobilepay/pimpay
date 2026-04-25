-- Script de migration pour ajouter le statut MAINTENANCE et les champs associes
-- A executer sur la base de donnees PostgreSQL

-- 1. Ajouter la valeur MAINTENANCE a l'enum UserStatus si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MAINTENANCE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
    ) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'MAINTENANCE';
    END IF;
END$$;

-- 2. Ajouter la colonne statusReason si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'statusReason'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "statusReason" TEXT;
    END IF;
END$$;

-- 3. Ajouter la colonne maintenanceUntil si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'maintenanceUntil'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "maintenanceUntil" TIMESTAMP;
    END IF;
END$$;

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name IN ('statusReason', 'maintenanceUntil');

SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus');
