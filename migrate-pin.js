/**
 * Script de Migration PIN - PimPay (Version JS pour Node.js)
 * * Marque les utilisateurs existants pour migration vers le PIN 6 chiffres.
 * Exécution: node scripts/migrate-pin.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migratePinVersions() {
  console.log("🔄 Démarrage de la migration des versions PIN (PimPay)...\n");

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

    // 2. Marquer les utilisateurs comme version 1 (4 chiffres legacy)
    const updateResult = await prisma.user.updateMany({
      where: {
        pin: { not: null },
        OR: [
          { pinVersion: null },
          { pinVersion: 1 },
        ],
      },
      data: {
        pinVersion: 1, // Force la migration au prochain login
      },
    });

    console.log(`\n✅ ${updateResult.count} utilisateurs marqués pour la migration PIN.`);

    // 3. Statistiques
    const stats = await prisma.user.groupBy({
      by: ["pinVersion"],
      where: {
        pin: { not: null },
      },
      _count: true,
    });

    console.log("\n📈 État des versions PIN dans la DB :");
    stats.forEach((stat) => {
      const versionLabel = stat.pinVersion === 1
        ? "4 chiffres (à migrer)"
        : stat.pinVersion === 2
        ? "6 chiffres (sécurisé)"
        : "Inconnu";
      console.log(`   Version ${stat.pinVersion}: ${stat._count} utilisateur(s) [${versionLabel}]`);
    });

    // 4. Aperçu des comptes concernés
    const examples = await prisma.user.findMany({
      where: { pinVersion: 1 },
      select: { id: true, email: true, username: true },
      take: 5,
    });

    if (examples.length > 0) {
      console.log("\n👥 Aperçu des comptes à migrer :");
      examples.forEach((u) => console.log(`   - ${u.email || u.username || u.id}`));
    }

    console.log("\n🎉 Opération réussie !");

  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migratePinVersions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
