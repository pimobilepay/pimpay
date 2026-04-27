import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

// Définition manuelle de l'enum pour éviter les erreurs d'import si Prisma n'est pas encore généré
const SystemWalletType = {
  ADMIN: 'ADMIN',
  TREASURY: 'TREASURY',
  HOT: 'HOT',
  LIQUIDITY: 'LIQUIDITY'
};

async function main() {
  console.log('🚀 Démarrage de la migration du système de Trésorerie PimPay...');

  const MAINNET_ADDRESS = "GAR24BUVFFTDYAQ5Q3KMZ36W2QPZNQHQFLLGJITB3CIGA6YJ6GZSU36G";

  const wallets = [
    {
      id: 'sw_admin_01',
      type: SystemWalletType.ADMIN,
      name: 'Admin Wallet',
      nameFr: 'Revenus Admin',
      description: 'Frais collectes sur toutes les transactions',
      publicAddress: MAINNET_ADDRESS,
      balanceUSD: 0,
      balancePi: 0,
      balanceXAF: 0,
      dailyLimit: 50000,
      monthlyLimit: 500000,
    },
    {
      id: 'sw_treasury_01',
      type: SystemWalletType.TREASURY,
      name: 'Treasury Wallet',
      nameFr: 'Tresorerie Securisee',
      description: 'Profits a long terme et reserves strategiques',
      publicAddress: MAINNET_ADDRESS,
      balanceUSD: 0,
      balancePi: 0,
      balanceXAF: 0,
      dailyLimit: 100000,
      monthlyLimit: 1000000,
    },
    {
      id: 'sw_hot_01',
      type: SystemWalletType.HOT,
      name: 'Hot Wallet',
      nameFr: 'Gas & Payouts',
      description: 'Fonds pour transactions automatiques et frais de gas',
      publicAddress: MAINNET_ADDRESS,
      balanceUSD: 0,
      balancePi: 0,
      balanceXAF: 0,
      dailyLimit: 25000,
      monthlyLimit: 250000,
    },
    {
      id: 'sw_liquidity_01',
      type: SystemWalletType.LIQUIDITY,
      name: 'Liquidity Reserve',
      nameFr: 'Reserve de Liquidite',
      description: 'Buffer pour retraits USD/Orange Money',
      publicAddress: MAINNET_ADDRESS,
      balanceUSD: 0,
      balancePi: 0,
      balanceXAF: 0,
      dailyLimit: 75000,
      monthlyLimit: 750000,
    }
  ];

  for (const wallet of wallets) {
    try {
      await prisma.systemWallet.upsert({
        where: { type: wallet.type as any },
        update: {
          balanceUSD: wallet.balanceUSD,
          balancePi: wallet.balancePi,
          balanceXAF: wallet.balanceXAF,
          publicAddress: wallet.publicAddress,
          updatedAt: new Date(),
        },
        create: wallet as any,
      });
      console.log(`✅ Wallet ${wallet.nameFr} synchronisé.`);
    } catch (error) {
      console.error(`❌ Erreur sur ${wallet.nameFr}:`, error);
    }
  }

  console.log('✨ Migration PimPay terminée.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
