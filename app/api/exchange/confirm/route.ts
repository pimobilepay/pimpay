// Extrait de la logique de transaction Prisma pour le support multi-devises
const targetWallet = await tx.wallet.findFirst({
  where: { 
    userId: userId, 
    currency: targetCurrency // Dynamique : "CDF", "XAF", etc.
  },
});

if (!targetWallet) {
  // Si l'utilisateur n'a pas encore de portefeuille dans cette devise, on le crée
  await tx.wallet.create({
    data: {
      userId: userId,
      currency: targetCurrency,
      balance: resultAmount,
    }
  });
} else {
  await tx.wallet.update({
    where: { id: targetWallet.id },
    data: { balance: { increment: resultAmount } }
  });
}
