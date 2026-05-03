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
import { encrypt } from '@/lib/crypto';

const prisma = new PrismaClient();

/**
 * generateCardToken()
 *
 * [FIX #8] PCI-DSS — Le CVV ne doit JAMAIS être stocké en clair, même en seed.
 * Règle PCI-DSS 3.2 : le CVV ne doit pas être stocké du tout après autorisation.
 *
 * Approche adoptée :
 *   - Le numéro de carte est chiffré via AES-256-CBC (lib/crypto.ts → encrypt())
 *   - Le CVV est remplacé par un token HMAC-SHA256 (référence opaque, non réversible)
 *     → impossible de retrouver le CVV original depuis la DB
 *   - En production, le CVV réel doit passer par un vault externe (ex: Stripe, HSM)
 *     et ne jamais toucher la base de données.
 *
 * Pour des données de seed (dev/test uniquement) :
 *   - On utilise des numéros fictifs qui ne correspondent à aucune carte réelle
 *   - On stocke le numéro chiffré et un token CVV opaque
 */
import { createHmac } from 'crypto';

function generateCvvToken(cvvPlain: string, cardNumber: string): string {
  const hmacSecret = process.env.CVV_HMAC_SECRET || process.env.ENCRYPTION_KEY || 'dev-hmac-secret-32-chars-minimum!';
  return createHmac('sha256', hmacSecret)
    .update(`${cardNumber}:${cvvPlain}`)
    .digest('hex')
    .substring(0, 16); // Token court de 16 chars — opaque, non réversible
}

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

  // 2. Préparation des identifiants admin — CHARGÉS DEPUIS LES VARIABLES D'ENVIRONNEMENT
  // [FIX #10] Aucune valeur sensible (PIN, mot de passe) n'est loguée
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminPin      = process.env.ADMIN_PIN;

  if (!adminPassword || !adminPin) {
    throw new Error(
      "[SEED] ADMIN_PASSWORD et ADMIN_PIN doivent être définis en variables d'environnement.\n" +
      "       Exemple : ADMIN_PASSWORD=xxxxx ADMIN_PIN=xxxxxx npx prisma db seed"
    );
  }

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
  const hashedAdminPin      = await bcrypt.hash(adminPin, 12);

  // [FIX #8] Données de carte admin — numéro chiffré, CVV tokenisé
  const adminCardNumber  = "5532990011228844"; // Fictif — format sans espaces pour chiffrement
  const adminCvvPlain    = "999";
  const adminCardEncrypted = encrypt(adminCardNumber);
  const adminCvvToken      = generateCvvToken(adminCvvPlain, adminCardNumber);

  // -----------------------------------------------------------------------------
  // 3. CRÉATION DU COMPTE ADMINISTRATEUR
  // -----------------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      phone:     "+2420655305",
      email:     process.env.ADMIN_EMAIL ?? "admin@pimpay.pi",
      username:  "admin",
      password:  hashedAdminPassword, // MOT DE PASSE SÉCURISÉ (bcrypt cost 12)
      pin:       hashedAdminPin,      // CODE PIN SÉCURISÉ   (bcrypt cost 12)
      name:      "HEADMASTER PIMPAY",
      firstName: "Super",
      lastName:  "Admin",
      role:      UserRole.ADMIN,
      status:    UserStatus.ACTIVE,
      kycStatus: KycStatus.VERIFIED,
      
      nationality:   "Congolaise CD",
      idType:        "PASSPORT",
      idNumber:      "A00000000",
      sourceOfFunds: "Corporate Savings",
      kycVerifiedAt: new Date(),

      dailyLimit:   50000,
      monthlyLimit: 200000,

      walletAddress: "GB_ADMIN_WALLET_ADDRESS_PI_NETWORK",
      piUserId:      "admin-pi-id-999",

      country: "République Démocratique Du Congo",
      city:    "Kinshasa",
      address: "Plateau, Cité Administrative",

      wallets: {
        create: {
          balance:  1000000.00,
          currency: "PI",
          type:     WalletType.PI,
        }
      },

      // [FIX #8] PCI-DSS : numéro chiffré AES-256, CVV tokenisé HMAC (non stocké en clair)
      virtualCards: {
        create: {
          number: adminCardEncrypted,  // AES-256-CBC via lib/crypto.ts
          exp:    "12/40",
          cvv:    adminCvvToken,       // Token HMAC opaque — CVV réel jamais stocké
          holder: "PIMPAY ADMIN",
          brand:  "MASTERCARD",
        }
      }
    }
  });

  // [FIX #8] Données de carte utilisateur — numéro chiffré, CVV tokenisé
  const userCardNumber  = "4492558299013342"; // Fictif — format sans espaces
  const userCvvPlain    = "342";
  const userCardEncrypted = encrypt(userCardNumber);
  const userCvvToken      = generateCvvToken(userCvvPlain, userCardNumber);

  // -----------------------------------------------------------------------------
  // 4. CRÉATION DE L'UTILISATEUR STANDARD (Support/Test)
  // -----------------------------------------------------------------------------
  const user = await prisma.user.create({
    data: {
      phone:      "+2250700000000",
      email:      "contact@pimpay.pi",
      name:       "JEAN-PIERRE PIMPAY",
      username:   "support",
      kycStatus:  KycStatus.VERIFIED,
      role:       UserRole.USER,
      status:     UserStatus.ACTIVE,
      walletAddress: "GDY6...PI_BLOCKCHAIN_ADDR",
      
      wallets: {
        create: {
          balance:  1540.75,
          currency: "PI",
          type:     WalletType.PI,
        }
      },

      // [FIX #8] PCI-DSS : même traitement que la carte admin
      virtualCards: {
        create: {
          number: userCardEncrypted,  // AES-256-CBC
          exp:    "08/29",
          cvv:    userCvvToken,       // Token HMAC opaque
          holder: "JEAN-PIERRE PIMPAY",
          brand:  "VISA",
        }
      },

      notifications: {
        createMany: {
          data: [
            { title: "Bienvenue",  message: "Votre compte Pi Wallet est prêt.", type: "success" },
            { title: "Sécurité",   message: "KYC approuvé avec succès.",        type: "info"    }
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
    { type: TransactionType.DEPOSIT,  amount: 500,  date: new Date('2025-12-18') },
    { type: TransactionType.DEPOSIT,  amount: 1200, date: new Date('2025-12-19') },
    { type: TransactionType.WITHDRAW, amount: 300,  date: new Date('2025-12-20') },
    { type: TransactionType.PAYMENT,  amount: 150,  date: new Date('2025-12-21') },
    { type: TransactionType.DEPOSIT,  amount: 450,  date: new Date('2025-12-22') },
    { type: TransactionType.TRANSFER, amount: 100,  date: new Date('2025-12-23') },
    { type: TransactionType.DEPOSIT,  amount: 250,  date: new Date('2025-12-24') },
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.create({
      data: {
        reference:   `TX-${Math.random().toString(36).substring(7).toUpperCase()}`,
        amount:      tx.amount,
        type:        tx.type,
        status:      TransactionStatus.SUCCESS,
        createdAt:   tx.date,
        fromUserId:  user.id,
        fromWalletId:userWalletId,
        description: `Opération ${tx.type.toLowerCase()} sur le réseau Pi`,
      }
    });
  }

  // LOG D'AUDIT
  await prisma.auditLog.create({
    data: {
      adminId:   admin.id,
      adminName: admin.name,
      action:    "INITIALIZE_SYSTEM",
      details:   "Initialisation complète de la base de données avec hachage des accès admin.",
    }
  });

  // [FIX #10] Aucune valeur sensible loguée (ni PIN, ni mot de passe, ni données de carte)
  console.log(`✅ Seed terminé avec succès !`);
  console.log(`👤 Admin créé : ${admin.email}`);
  console.log(`👤 Support créé : ${user.email}`);
  console.log(`🔑 Credentials chargés depuis les variables d'environnement`);
  console.log(`💳 Cartes virtuelles créées avec numéros chiffrés AES-256 et CVV tokenisés`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
