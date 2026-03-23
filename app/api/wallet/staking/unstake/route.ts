export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const piToken = cookieStore.get("pi_session_token")?.value;
  const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

  if (piToken) {
    return piToken;
  } else if (classicToken) {
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(classicToken, secretKey);
      return payload.id as string;
    } catch {
      return null;
    }
  }
  return null;
}

// POST - Unstake (withdraw staking position)
export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { stakingId } = body;

    if (!stakingId) {
      return NextResponse.json({ error: "ID de staking requis" }, { status: 400 });
    }

    // Find the staking position
    const staking = await prisma.staking.findFirst({
      where: { id: stakingId, userId, isActive: true }
    });

    if (!staking) {
      return NextResponse.json({ error: "Staking non trouvé ou déjà clôturé" }, { status: 404 });
    }

    // Check if locked staking has ended
    if (staking.endDate && new Date() < staking.endDate) {
      const daysLeft = Math.ceil((staking.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return NextResponse.json({ 
        error: `Staking verrouillé. ${daysLeft} jours restants.` 
      }, { status: 400 });
    }

    // Calculate final rewards (prorated based on time staked)
    const daysStaked = Math.floor((Date.now() - staking.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = staking.apy / 365 / 100;
    const finalRewards = staking.amount * dailyRate * daysStaked;
    const totalAmount = staking.amount + finalRewards;

    // Determine currency based on staking (we'll assume PI for now, could be enhanced)
    const currency = 'PI'; // In production, store currency in Staking model

    // Find or create user's wallet
    let wallet = await prisma.wallet.findFirst({
      where: { userId, currency }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, currency, balance: 0 }
      });
    }

    // Close staking and return funds in a transaction
    await prisma.$transaction([
      prisma.staking.update({
        where: { id: stakingId },
        data: { 
          isActive: false, 
          rewardsEarned: finalRewards,
          endDate: new Date()
        }
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: totalAmount } }
      }),
      prisma.transaction.create({
        data: {
          reference: `UNSTK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount: totalAmount,
          currency,
          type: 'STAKING_REWARD',
          status: 'SUCCESS',
          description: `Unstake + Rewards (${daysStaked} jours @ ${staking.apy}% APY)`,
          toUserId: userId,
          toWalletId: wallet.id
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Staking clôturé avec succès",
      details: {
        principal: staking.amount,
        rewards: finalRewards,
        total: totalAmount,
        daysStaked
      }
    });

  } catch (error: any) {
    console.error("❌ [UNSTAKE_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de clôturer le staking" }, { status: 500 });
  }
}
