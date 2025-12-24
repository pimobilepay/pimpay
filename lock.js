const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createAdmin() {
  console.log("🚀 Lancement de la création de l'admin et de tous les services...");

  const adminEmail = "admin@pimpay.com";
  const plainPassword = "AdminPassword123!";
  const plainPin = "0000";

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const hashedPin = await bcrypt.hash(plainPin, 10);

    // On utilise delete puis create pour repartir sur un compte propre avec tous les services
    // Ou upsert si vous voulez juste mettre à jour.
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        status: "ACTIVE",
        password: hashedPassword,
        pin: hashedPin,
      },
      create: {
        name: "Super Admin",
        email: adminEmail,
        phone: "+242000000001",
        password: hashedPassword,
        pin: hashedPin,
        role: "ADMIN",
        status: "ACTIVE",
        balancePi: 5000,
        balanceUsd: 1000,
        
        // --- SERVICE : WALLETS (Portefeuilles) ---
        wallets: {
          create: [
            { balance: 5000, currency: "PI", type: "PI" },
            { balance: 1000, currency: "USD", type: "FIAT" }
          ]
        },

        // --- SERVICE : VIRTUAL CARDS (Cartes Virtuelles) ---
        virtualCards: {
          create: [
            {
              number: "4505000011112222",
              exp: "12/28",
              cvv: "321",
              holder: "SUPER ADMIN",
              locked: false
            }
          ]
        },

        // --- SERVICE : VAULTS (Coffres d'épargne) ---
        vaults: {
          create: [
            {
              name: "Réserve de Sécurité",
              amount: 2500,
              interestRate: 5.0,
            }
          ]
        },

        // --- SERVICE : NOTIFICATIONS ---
        notifications: {
          create: [
            {
              title: "Bienvenue Admin",
              message: "Votre console d'administration est prête.",
              type: "SYSTEM"
            }
          ]
        }
      },
      include: {
        wallets: true,
        virtualCards: true
      }
    });

    console.log("------------------------------------------");
    console.log("✅ SUCCÈS : Admin et Services configurés !");
    console.log(`📧 Email: ${admin.email}`);
    console.log(`💳 Carte: ${admin.virtualCards[0]?.number || "Non créée"}`);
    console.log(`💰 Wallets: ${admin.wallets.length} actifs`);
    console.log("------------------------------------------");

  } catch (error) {
    console.error("❌ ERREUR LORS DE LA CRÉATION DES SERVICES :");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
