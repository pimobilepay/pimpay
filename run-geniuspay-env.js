const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Début de l\'ajout de la colonne geniuspayEnv...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SystemConfig"
        ADD COLUMN IF NOT EXISTS "geniuspayEnv" TEXT NOT NULL DEFAULT 'sandbox';
    `);

    console.log('Colonne "geniuspayEnv" ajoutée avec succès dans SystemConfig !');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la table SystemConfig :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

