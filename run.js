const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Début de la migration AgentFloat...');

  try {
    // 1. Création de la table
    console.log('Création de la table AgentFloat...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AgentFloat" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "currency"  TEXT NOT NULL DEFAULT 'XAF',
        "balance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
        "reserved"  DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AgentFloat_pkey" PRIMARY KEY ("id")
      );
    `);

    // 2. Création de l'index unique
    console.log('Création de l index unique...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AgentFloat_userId_currency_key"
        ON "AgentFloat" ("userId", "currency");
    `);

    // 3. Création de l'index de recherche
    console.log('Création de l index userId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AgentFloat_userId_idx"
        ON "AgentFloat" ("userId");
    `);

    // 4. Ajout de la contrainte de clé étrangère
    console.log('Ajout de la clé étrangère...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        ALTER TABLE "AgentFloat"
          ADD CONSTRAINT "AgentFloat_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 5. Initialisation des caisses agents
    console.log('Initialisation des caisses agents...');
    const inserted = await prisma.$executeRawUnsafe(`
      INSERT INTO "AgentFloat" ("id", "userId", "currency", "balance", "reserved", "createdAt", "updatedAt")
      SELECT
        'aflt_' || md5(u."id" || ':XAF'),
        u."id",
        'XAF',
        0,
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "User" u
      WHERE u."role" = 'AGENT'
      ON CONFLICT ("userId", "currency") DO NOTHING;
    `);

    console.log(`Migration terminée avec succès ! (${inserted} caisses d'agent initialisées)`);
  } catch (error) {
    console.error('Erreur durant la migration :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
