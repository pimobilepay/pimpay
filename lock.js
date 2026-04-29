const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const plainPassword = process.env.ADMIN_PASSWORD;
  const plainPin = process.env.ADMIN_PIN;

  if (!adminEmail || !plainPassword || !plainPin) {
    console.error("❌ Variables manquantes: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PIN doivent être définies dans .env");
    process.exit(1);
  }

  console.log("🚀 Création de l'admin...");

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    const hashedPin = await bcrypt.hash(plainPin, 12);

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
        phone: process.env.ADMIN_PHONE || "+242000000001",
        password: hashedPassword,
        pin: hashedPin,
        role: "ADMIN",
        status: "ACTIVE",
        balancePi: 0,
        balanceUsd: 0,
        wallets: {
          create: [
            { balance: 0, currency: "PI", type: "PI" },
            { balance: 0, currency: "USD", type: "FIAT" }
          ]
        },
        notifications: {
          create: [{
            title: "Bienvenue Admin",
            message: "Votre console d'administration est prête.",
            type: "SYSTEM"
          }]
        }
      },
      include: { wallets: true }
    });

    console.log("✅ Admin créé avec succès !");
    console.log(`📧 Email: ${admin.email}`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
