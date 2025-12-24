import { PrismaClient, UserRole, UserStatus, KycStatus, WalletType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = "admin@pimpay.com" // Ton email admin
  const hashedPassword = await bcrypt.hash("Darkina2012@.", 12)

  console.log('--- Début du Seed Admin ---')

  // 1. Création ou mise à jour de l'admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.VERIFIED,
    },
    create: {
      email: adminEmail,
      phone: "+242065540305", // À changer
      username: "admin",
      password: hashedPassword,
      name: "Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.VERIFIED,
      walletAddress: "GD...ADMIN_PI_ADDRESS", // Adresse fictive ou réelle
    },
  })

  console.log(`✅ Admin ${admin.email} configuré.`)

  // 2. Initialisation d'un Wallet PI pour l'admin (si inexistant)
  const adminWallet = await prisma.wallet.upsert({
    where: { 
      // Comme il n'y a pas d'index unique sur userId seul, 
      // on vérifie l'existence par une recherche simple
      id: "admin-pi-wallet-id" 
    },
    update: {},
    create: {
      id: "admin-pi-wallet-id",
      userId: admin.id,
      balance: 1000.0,
      currency: "PI",
      type: WalletType.PI,
    },
  })

  console.log(`✅ Wallet Admin initialisé avec ${adminWallet.balance} PI.`)

  // 3. Création d'une Carte Virtuelle test pour l'admin
  await prisma.virtualCard.upsert({
    where: { number: "4509 1234 5678 4492" },
    update: {},
    create: {
      userId: admin.id,
      number: "4509 1234 5678 4492",
      exp: "12/28",
      cvv: "342",
      holder: admin.name || "Admin",
      locked: false,
    },
  })

  console.log('✅ Carte virtuelle de test ajoutée.')
  console.log('--- Seed terminé avec succès ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
