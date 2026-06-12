import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret, logCronStart, logCronEnd } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // [FIX V21] — Vérification centralisée via lib/cron-auth.ts (supporte rotation)
  if (!verifyCronSecret(req)) {
    console.warn("[CRON:staking-rewards] Accès refusé — secret invalide");
    return new Response('Unauthorized', { status: 401 });
  }
  logCronStart("staking-rewards", req);

  try {
    // Calcul des récompenses pour tous les stakings actifs
    const stakings = await prisma.staking.findMany({ where: { isActive: true } });

    for (const stake of stakings) {
      const reward = (stake.amount * stake.apy) / 100 / 365; // Gain journalier
      const newTotalRewards = (stake.rewardsEarned || 0) + reward;

      // Identification fiable de la crypto (Pi ou SDA).
      // L'APY du pool identifie de maniere unique la devise:
      //   - SDA : 12% (sda-flex / sda-staking)
      //   - PI  : 8.5% (pi-flex) ou 14.2% (pi-locked)
      // On se base donc sur l'APY en priorite (corrige les anciens stakings
      // mal etiquetes 'PI' par defaut), et on retombe sur la devise enregistree
      // uniquement si l'APY ne correspond a aucun pool connu.
      const stored = (stake.currency || '').toUpperCase();
      let currency: 'PI' | 'SDA';
      if (stake.apy === 12) {
        currency = 'SDA';
      } else if (stake.apy === 8.5 || stake.apy === 14.2) {
        currency = 'PI';
      } else {
        currency = stored === 'SDA' ? 'SDA' : 'PI';
      }

      // Backfill: enregistre la devise corrigee pour fiabiliser les prochains calculs
      const needsBackfill = stored !== currency;

      // Calculer la date de fin si elle existe
      const endDate = stake.endDate 
        ? new Date(stake.endDate).toLocaleDateString('fr-FR')
        : null;
      
      await prisma.$transaction([
        prisma.staking.update({
          where: { id: stake.id },
          data: needsBackfill
            ? { rewardsEarned: { increment: reward }, currency }
            : { rewardsEarned: { increment: reward } }
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
