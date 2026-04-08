import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  // Vérification de la clé secrète pour que seul Vercel puisse appeler cette route
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Calcul des récompenses pour tous les stakings actifs
    const stakings = await prisma.staking.findMany({ where: { isActive: true } });

    for (const stake of stakings) {
      const reward = (stake.amount * stake.apy) / 100 / 365; // Gain journalier
      const newTotalRewards = (stake.rewardsEarned || 0) + reward;
      const currency = stake.currency || 'PI';
      
      // Calculer la date de fin si elle existe
      const endDate = stake.endDate 
        ? new Date(stake.endDate).toLocaleDateString('fr-FR')
        : null;
      
      await prisma.$transaction([
        prisma.staking.update({
          where: { id: stake.id },
          data: { rewardsEarned: { increment: reward } }
        }),
        prisma.notification.create({
          data: {
            userId: stake.userId,
            title: "Recompense de Staking",
            message: `Vous avez gagne +${reward.toFixed(6)} ${currency} aujourd'hui sur votre staking de ${stake.amount.toLocaleString()} ${currency} a ${stake.apy}% APY. Total cumule: ${newTotalRewards.toFixed(6)} ${currency}.`,
            type: "STAKING_REWARD",
            metadata: JSON.stringify({
              type: "STAKING_REWARD",
              stakingId: stake.id,
              stakingAmount: stake.amount,
              rewardAmount: reward,
              totalRewards: newTotalRewards,
              apy: stake.apy,
              currency: currency,
              stakingStatus: "ACTIVE",
              unlockDate: endDate,
              dailyReward: reward,
            })
          }
        })
      ]);
    }

    return NextResponse.json({ success: true, processed: stakings.length });
  } catch (error) {
    return NextResponse.json({ error: "Erreur Cron" }, { status: 500 });
  }
}
