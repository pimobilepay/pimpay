const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Début de la migration de COMPLETED vers SUCCESS...");
  
  // Utilisation du SQL brut pour être sûr de passer
  // Note: PostgreSQL est sensible à la casse, on utilise les doubles quotes
  try {
    const count = await prisma.$executeRaw`UPDATE "Transaction" SET "status" = 'SUCCESS' WHERE "status" = 'COMPLETED';`;
    console.log(`✅ Réussite ! ${count} transactions ont été mises à jour.`);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

main().finally(() => prisma.$disconnect());
