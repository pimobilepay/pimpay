const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAgentRole() {
  try {
    console.log("Début de la migration SQL...");

    // 1. Création de l'énumération AgentRole
    // Note : On utilise une vérification pour éviter une erreur si l'id existe déjà
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AgentRole" AS ENUM ('AGENT', 'SUPERVISOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("- Type Enum 'AgentRole' vérifié/créé.");

    // 2. Ajout de la colonne agentRole à la table User
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "agentRole" "AgentRole" DEFAULT 'AGENT';
    `);
    console.log("- Colonne 'agentRole' ajoutée avec succès.");

    console.log("Migration terminée.");
  } catch (error) {
    console.error("Erreur lors de la migration :", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAgentRole();
