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
      
      await prisma.$transaction([
        prisma.staking.update({
          where: { id: stake.id },
          data: { rewardsEarned: { increment: reward } }
        }),
        prisma.notification.create({
          data: {
            userId: stake.userId,
            title: "Récompense de Staking 💰",
            message: `Vous avez gagné ${reward.toFixed(4)} Pi aujourd'hui.`,
            type: "success"
          }
        })
      ]);
    }

    return NextResponse.json({ success: true, processed: stakings.length });
  } catch (error) {
    return NextResponse.json({ error: "Erreur Cron" }, { status: 500 });
  }
}
