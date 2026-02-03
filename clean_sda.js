const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPimPay() {
  console.log("🚀 Nettoyage ciblé de PimPay...");

  try {
    // On cible les transactions suspectes par leur montant de test
    const suspectAmounts = [0.888, 0.02]; 
    
    const deleteAction = await prisma.transaction.deleteMany({
      where: {
        amount: { in: suspectAmounts },
        currency: "SDA"
      }
    });

    console.log(`✅ Succès : ${deleteAction.count} transactions de test supprimées.`);
    console.log("💡 Si elles reviennent, le coupable est un useEffect dans ton Dashboard !");

  } catch (error) {
    console.error("❌ Erreur :", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanPimPay();

