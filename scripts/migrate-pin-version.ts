/**
 * Script de Migration PIN - PimPay
 * 
 * Ce script marque tous les utilisateurs existants avec un PIN
 * comme nécessitant une migration vers le PIN 6 chiffres.
 * 
 * Usage: npx ts-node scripts/migrate-pin-version.ts
 * Ou: pnpm exec ts-node scripts/migrate-pin-version.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migratePinVersions() {
  console.log("🔄 Démarrage de la migration des versions PIN...\n");

  try {
    // 1. Compter les utilisateurs avec un PIN existant
    const usersWithPin = await prisma.user.count({
      where: {
        pin: { not: null },
      },
    });

    console.log(`📊 Utilisateurs avec un PIN existant: ${usersWithPin}`);

    if (usersWithPin === 0) {
      console.log("✅ Aucun utilisateur à migrer.");
      return;
    }

    // 2. Marquer tous les utilisateurs avec un PIN comme version 1 (4 chiffres legacy)
    // Cela forcera la migration lors de leur prochaine connexion
    const updateResult = await prisma.user.updateMany({
      where: {
        pin: { not: null },
        OR: [
          { pinVersion: null },
          { pinVersion: 1 },
        ],
      },
      data: {
        pinVersion: 1, // Version 1 = PIN 4 chiffres (nécessite migration)
      },
    });

    console.log(`\n✅ ${updateResult.count} utilisateurs marqués pour migration PIN.`);

    // 3. Statistiques détaillées
    const stats = await prisma.user.groupBy({
      by: ["pinVersion"],
      where: {
        pin: { not: null },
      },
      _count: true,
    });

    console.log("\n📈 Statistiques des versions PIN:");
    stats.forEach((stat) => {
      const versionLabel = stat.pinVersion === 1 
        ? "4 chiffres (legacy)" 
        : stat.pinVersion === 2 
        ? "6 chiffres (nouveau)" 
        : "Non défini";
      console.log(`   Version ${stat.pinVersion}: ${stat._count} utilisateurs (${versionLabel})`);
    });

    // 4. Liste des utilisateurs à migrer (limité à 10 pour l'affichage)
    const usersToMigrate = await prisma.user.findMany({
      where: {
        pin: { not: null },
        pinVersion: 1,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
      take: 10,
    });

    if (usersToMigrate.length > 0) {
      console.log("\n👥 Exemples d'utilisateurs à migrer:");
      usersToMigrate.forEach((user) => {
        console.log(`   - ${user.email || user.username || user.id} (créé le ${user.createdAt.toLocaleDateString("fr-FR")})`);
      });
      
      if (updateResult.count > 10) {
        console.log(`   ... et ${updateResult.count - 10} autres`);
      }
    }

    console.log("\n🎉 Migration terminée avec succès!");
    console.log("\n📝 Prochaines étapes:");
    console.log("   1. Les utilisateurs verront l'écran de migration lors de leur prochaine connexion");
    console.log("   2. Ils devront créer un nouveau PIN à 6 chiffres");
    console.log("   3. Une fois migré, leur pinVersion passera à 2");

  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
migratePinVersions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
