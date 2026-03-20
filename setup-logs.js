const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid'); // Assure-toi d'avoir 'uuid' ou utilise Math.random

async function runSQL(description, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`✅ ${description}`);
  } catch (error) {
    console.error(`❌ Erreur [${description}] :`, error.message);
  }
}

async function main() {
  console.log('🚀 Initialisation du système de logs pour PimPay...\n');

  // 1. Création de l'Enum LogLevel
  await runSQL("Création de l'Enum LogLevel", `
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogLevel') THEN
            CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
        END IF;
    END $$;
  `);

  // 2. Création de la table SystemLog
  await runSQL("Création de la table SystemLog", `
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
  `);

  // 3. Création des Index (un par un pour éviter les erreurs de batch)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level")',
    'CREATE INDEX IF NOT EXISTS "SystemLog_source_idx" ON "SystemLog"("source")',
    'CREATE INDEX IF NOT EXISTS "SystemLog_createdAt_idx" ON "SystemLog"("createdAt")',
    'CREATE INDEX IF NOT EXISTS "SystemLog_userId_idx" ON "SystemLog"("userId")'
  ];

  for (const idx of indexes) {
    await runSQL("Création d'index", idx);
  }

  // 4. Insertion du log initial
  // On génère l'ID en JS pour éviter les problèmes d'extension pgcrypto manquante sur ta DB
  const initialId = Date.now().toString(); 
  await runSQL("Insertion du log de vérification", `
    INSERT INTO "SystemLog" ("id", "level", "source", "action", "message", "details")
    VALUES ('${initialId}', 'INFO', 'SYSTEM', 'MIGRATION', 'Table SystemLog creee avec succes', '{"version": "1.0"}');
  `);

  console.log('\n✨ Configuration terminée !');
  await prisma.$disconnect();
}

main();
