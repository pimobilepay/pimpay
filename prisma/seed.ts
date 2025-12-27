import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Initialise la configuration système (Prix GCV)
  await prisma.systemConfig.upsert({
    where: { id: 'GLOBAL_CONFIG' },
    update: {},
    create: {
      id: 'GLOBAL_CONFIG',
      consensusPrice: 314159,
      transactionFee: 0.01,
      stakingAPY: 15.0,
    },
  })

  // 2. Initialise un utilisateur de test avec du solde si nécessaire
  // Remplace 'ID_DE_TON_USER' par l'ID que tu vois dans tes logs (cmjkcidh70000s6zyufb0wduy)
  const testUserId = "cmjl1oaw3000es643tkms0eud";
  
  await prisma.wallet.upsert({
    where: { userId_currency: { userId: testUserId, currency: "PI" } },
    update: { balance: 1000 },
    create: {
      userId: cmjl1oaw3000es643tkms0eud,
      currency: "PI",
      balance: 1000,
      type: "PI"
    }
  })

  console.log("✅ Seed terminé : Config GCV et Wallet de test prêts.")
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
