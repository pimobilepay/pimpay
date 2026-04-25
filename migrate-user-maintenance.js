/**
 * Script de migration PimPay - Statut MAINTENANCE et champs associés
 * Ajoute le statut à l'ENUM UserStatus et les colonnes à la table User
 * Exécution : node migrate-user-maintenance.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateUserMaintenance() {
  console.log('🚀 Démarrage de la migration de la table User...');

  try {
    // 1. Mise à jour de l'ENUM UserStatus
    console.log('⏳ Vérification de l\'ENUM UserStatus...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = 'MAINTENANCE'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
          ) THEN
              ALTER TYPE "UserStatus" ADD VALUE 'MAINTENANCE';
              RAISE NOTICE 'Valeur MAINTENANCE ajoutée à UserStatus';
          END IF;
      END$$;
    `);

    // 2. Ajout de la colonne statusReason
    console.log('⏳ Vérification de la colonne statusReason...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'User' AND column_name = 'statusReason'
          ) THEN
              ALTER TABLE "User" ADD COLUMN "statusReason" TEXT;
              RAISE NOTICE 'Colonne statusReason ajoutée';
          END IF;
      END$$;
    `);

    // 3. Ajout de la colonne maintenanceUntil
    console.log('⏳ Vérification de la colonne maintenanceUntil...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'User' AND column_name = 'maintenanceUntil'
          ) THEN
              ALTER TABLE "User" ADD COLUMN "maintenanceUntil" TIMESTAMP;
              RAISE NOTICE 'Colonne maintenanceUntil ajoutée';
          END IF;
      END$$;
    `);

    console.log('\n✅ Migration terminée avec succès !');

    // --- Vérification finale ---
    console.log('\n📊 Structure actuelle de la table User :');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('statusReason', 'maintenanceUntil')
    `;
    console.table(tableInfo);

    console.log('📊 Valeurs de l\'ENUM UserStatus :');
    const enumInfo = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')
    `;
    console.table(enumInfo);

  } catch (error) {
    console.error('❌ Erreur lors de la migration :', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUserMaintenance();
