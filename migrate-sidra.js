/**
 * Migration: Rename wallet currency "SIDRA" -> "SDA"
 * Projet: PimPay
 * Date: 19 Février 2026
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("[FIX] Démarrage de la migration SIDRA -> SDA...");

  // Trouver tous les portefeuilles avec la devise "SIDRA"
  const sidraWallets = await prisma.wallet.findMany({
    where: { currency: "SIDRA" },
  });

  console.log(`[FIX] ${sidraWallets.length} portefeuille(s) "SIDRA" trouvés.`);

  let updated = 0;
  let merged = 0;
  let errors = 0;

  for (const wallet of sidraWallets) {
    try {
      // Vérifier si l'utilisateur a déjà un portefeuille "SDA"
      const existingSda = await prisma.wallet.findUnique({
        where: { 
          userId_currency: { 
            userId: wallet.userId, 
            currency: "SDA" 
          } 
        },
      });

      if (existingSda) {
        // L'utilisateur a les deux - on fusionne les soldes et on supprime l'ancien
        const mergedBalance = Math.max(existingSda.balance, wallet.balance);
        
        await prisma.wallet.update({
          where: { id: existingSda.id },
          data: { 
            balance: mergedBalance, 
            type: "SIDRA" 
          },
        });

        await prisma.wallet.delete({ 
          where: { id: wallet.id } 
        });

        merged++;
        console.log(`[FIX] Fusionné SIDRA pour l'user ${wallet.userId} (Solde: ${mergedBalance})`);
      } else {
        // Simple renommage de SIDRA en SDA
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { currency: "SDA" },
        });
        updated++;
        console.log(`[FIX] Renommé SIDRA -> SDA pour l'user ${wallet.userId}`);
      }
    } catch (err) {
      errors++;
      console.error(`[FIX] Erreur sur le wallet ${wallet.id}:`, err.message);
    }
  }

  console.log("---");
  console.log(`[FIX] Migration terminée : ${updated} renommés, ${merged} fusionnés, ${errors} erreurs.`);
}

main()
  .catch((e) => {
    console.error("[FIX] Erreur fatale lors de la migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
