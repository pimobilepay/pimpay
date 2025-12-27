import { PrismaClient, UserRole, UserStatus, KycStatus, WalletType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Initialisation du Seed PimPay...");

  // 1. CONFIGURATION SYSTÈME GLOBALE
  const systemConfig = await prisma.systemConfig.upsert({
    where: { id: "GLOBAL_CONFIG" },
    update: {},
    create: {
      id: "GLOBAL_CONFIG",
      maintenanceMode: false,
      transactionFee: 0.01,      // 1%
      minWithdrawal: 1.0,        // 1 Pi
      maxWithdrawal: 5000.0,
      consensusPrice: 314159.0,  // GCV
      stakingAPY: 15.0,
      totalProfit: 0.0,
    },
  });
  console.log("✅ Configuration Système initialisée");

  // 2. CRÉATION DE L'ADMINISTRATEUR
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "+242000000000" },
    update: {},
    create: {
      phone: "+242000000000",
      email: "admin@pimpay.com",
      username: "pimpay_root",
      name: "Super Admin",
      password: adminPassword,
      pin: "1234",
      role: UserRole.ADMIN,
      kycStatus: KycStatus.VERIFIED,
      status: UserStatus.ACTIVE,
      wallets: {
        create: {
          balance: 1000000.0,
          currency: "PI",
          type: WalletType.PI
        }
      }
    },
  });
  console.log(`✅ Admin créé: ${admin.email}`);

  // 3. CRÉATION D'UN MARCHAND DE TEST
  const merchantPassword = await bcrypt.hash("Merchant123!", 10);
  const merchantUser = await prisma.user.upsert({
    where: { phone: "+242111111111" },
    update: {},
    create: {
      phone: "+242111111111",
      email: "boutique@pimpay.com",
      username: "shop_test",
      name: "Boutique Officielle Pi",
      password: merchantPassword,
      role: UserRole.MERCHANT,
      kycStatus: KycStatus.VERIFIED,
      status: UserStatus.ACTIVE,
      wallets: {
        create: {
          balance: 500.0,
          currency: "PI"
        }
      },
      merchantProfile: {
        create: {
          name: "Pi Eco Shop",
          category: "Technologie",
          address: "Avenue du Marché",
          city: "Brazzaville",
          country: "Congo",
          latitude: -4.2634,
          longitude: 15.2429,
          isVerified: true
        }
      }
    }
  });
  console.log("✅ Marchand de test créé");

  // 4. QUELQUES UTILISATEURS POUR LES ANALYTICS
  const userPassword = await bcrypt.hash("User123!", 10);
  for (let i = 1; i <= 3; i++) {
    await prisma.user.upsert({
      where: { phone: `+24288888888${i}` },
      update: {},
      create: {
        phone: `+24288888888${i}`,
        email: `user${i}@gmail.com`,
        username: `pioneer_${i}`,
        name: `User Test ${i}`,
        password: userPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        wallets: {
          create: {
            balance: Math.random() * 100,
            currency: "PI"
          }
        }
      }
    });
  }
  console.log("✅ Utilisateurs de test créés");

  console.log("⭐ Seed terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
