import { 
  PrismaClient, 
  KycStatus, 
  UserRole, 
  UserStatus, 
  TransactionType, 
  TransactionStatus, 
  WalletType 
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Début du peuplement de la base de données FinTech Web3...");

  // 1. Nettoyage complet
  await prisma.transaction.deleteMany({});
  await prisma.virtualCard.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Préparation des identifiants sécurisés (Admin seulement)
  // Mot de passe par défaut : Admin@2025
  // PIN par défaut : 2025
  const hashedAdminPassword = await bcrypt.hash("Admin@2025", 10);
  const hashedAdminPin = await bcrypt.hash("2025", 10);

  // -----------------------------------------------------------------------------
  // 3. CRÉATION DU COMPTE ADMINISTRATEUR
  // -----------------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      phone: "+2420655305",
      email: "admin@pimpay.pi",
      username: "admin",
      password: hashedAdminPassword, // MOT DE PASSE SÉCURISÉ
      pin: hashedAdminPin,           // CODE PIN SÉCURISÉ
      name: "HEADMASTER PIMPAY",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.VERIFIED,
      
      nationality: "Congolaise CD",
      idType: "PASSPORT",
      idNumber: "A00000000",
      sourceOfFunds: "Corporate Savings",
      kycVerifiedAt: new Date(),

      dailyLimit: 50000,
      monthlyLimit: 200000,

      walletAddress: "GB_ADMIN_WALLET_ADDRESS_PI_NETWORK",
      piUserId: "admin-pi-id-999",

      country: "République Démocratique Du Congo",
      city: "Kinshasa",
      address: "Plateau, Cité Administrative",

      wallets: {
        create: {
          balance: 1000000.00,
          currency: "PI",
          type: WalletType.PI,
        }
      },

      virtualCards: {
        create: {
          number: "5532 9900 1122 8844",
          exp: "12/40",
          cvv: "999",
          holder: "PIMPAY ADMIN",
          brand: "MASTERCARD",
        }
      }
    }
  });

  // -----------------------------------------------------------------------------
  // 4. CRÉATION DE L'UTILISATEUR STANDARD (Support/Test)
  // -----------------------------------------------------------------------------
  const user = await prisma.user.create({
    data: {
      phone: "+2250700000000",
      email: "contact@pimpay.pi",
      name: "JEAN-PIERRE PIMPAY",
      username: "support",
      kycStatus: KycStatus.VERIFIED,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      walletAddress: "GDY6...PI_BLOCKCHAIN_ADDR",
      
      wallets: {
        create: {
          balance: 1540.75,
          currency: "PI",
          type: WalletType.PI,
        }
      },

      virtualCards: {
        create: {
          number: "4492 5582 9901 3342",
          exp: "08/29",
          cvv: "342",
          holder: "JEAN-PIERRE PIMPAY",
          brand: "VISA",
        }
      },

      notifications: {
        createMany: {
          data: [
            { title: "Bienvenue", message: "Votre compte Pi Wallet est prêt.", type: "success" },
            { title: "Sécurité", message: "KYC approuvé avec succès.", type: "info" }
          ]
        }
      }
    },
    include: { wallets: true }
  });

  const userWalletId = user.wallets[0].id;

  // -----------------------------------------------------------------------------
  // 5. CRÉATION DE L'HISTORIQUE DES TRANSACTIONS
  // -----------------------------------------------------------------------------
  const transactionsData = [
    { type: TransactionType.DEPOSIT, amount: 500, date: new Date('2025-12-18') },
    { type: TransactionType.DEPOSIT, amount: 1200, date: new Date('2025-12-19') },
    { type: TransactionType.WITHDRAW, amount: 300, date: new Date('2025-12-20') },
    { type: TransactionType.PAYMENT, amount: 150, date: new Date('2025-12-21') },
    { type: TransactionType.DEPOSIT, amount: 450, date: new Date('2025-12-22') },
    { type: TransactionType.TRANSFER, amount: 100, date: new Date('2025-12-23') },
    { type: TransactionType.DEPOSIT, amount: 250, date: new Date('2025-12-24') },
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.create({
      data: {
        reference: `TX-${Math.random().toString(36).substring(7).toUpperCase()}`,
        amount: tx.amount,
        type: tx.type,
        status: TransactionStatus.SUCCESS,
        createdAt: tx.date,
        fromUserId: user.id,
        fromWalletId: userWalletId,
        description: `Opération ${tx.type.toLowerCase()} sur le réseau Pi`,
      }
    });
  }

  // LOG D'AUDIT POUR L'ADMIN
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action: "INITIALIZE_SYSTEM",
      details: "Initialisation complète de la base de données avec hachage des accès admin.",
    }
  });

  console.log(`✅ Succès !`);
  console.log(`👤 Admin créé : ${admin.email}`);
  console.log(`🔑 Mot de passe : Admin@2025`);
  console.log(`🔢 Code PIN : 2025`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
