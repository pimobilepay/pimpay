const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateSystemConfig() {
  console.log("🚀 Début de la migration des frais système...");

  try {
    // 1. Ajout des colonnes et mise à jour des données en une seule transaction
    await prisma.$transaction([
      // Ajout des colonnes Crypto
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "depositCryptoFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01`),

      // Ajout des colonnes Fiat
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "withdrawMobileFee" DOUBLE PRECISION NOT NULL DEFAULT 0.025`),
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "withdrawBankFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02`),

      // Ajout des colonnes Paiements
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "merchantPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02`),
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "billPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.015`),
      prisma.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "qrPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01`),

      // Initialisation de la ligne GLOBAL_CONFIG
      prisma.$executeRawUnsafe(`
        UPDATE "SystemConfig"
        SET
          "depositCryptoFee" = 0.01,
          "withdrawMobileFee" = COALESCE("withdrawFee", 0.02) + 0.005,
          "withdrawBankFee" = COALESCE("withdrawFee", 0.02),
          "merchantPaymentFee" = 0.02,
          "billPaymentFee" = 0.015,
          "qrPaymentFee" = 0.01
        WHERE id = 'GLOBAL_CONFIG'
      `)
    ]);

    console.log("✅ Migration réussie : Les colonnes ont été ajoutées et les frais initialisés.");

  } catch (error) {
    console.error("❌ Erreur lors de la migration :");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSystemConfig();
