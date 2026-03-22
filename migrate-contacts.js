const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateP2PContacts() {
  console.log("🚀 Début de la création de la table P2PContact...");

  try {
    // Exécution du SQL brut
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "P2PContact" (
        id TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "contactId" TEXT NOT NULL,
        name TEXT NOT NULL,
        nickname TEXT,
        "isFavorite" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
        FOREIGN KEY ("contactId") REFERENCES "User"(id) ON DELETE CASCADE,
        UNIQUE("userId", "contactId")
      );
    `);

    // Création des index
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "P2PContact_userId_idx" ON "P2PContact"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "P2PContact_contactId_idx" ON "P2PContact"("contactId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "P2PContact_isFavorite_idx" ON "P2PContact"("isFavorite");`);

    console.log("✅ Table P2PContact et index créés avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateP2PContacts();

