export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { logSystemEvent } from "@/lib/systemLogger";

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

    // Calculate days staked and check if early withdrawal
    const daysStaked = Math.floor((Date.now() - staking.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = staking.apy / 365 / 100;
    let finalRewards = staking.amount * dailyRate * daysStaked;
    
    // Early withdrawal penalty: 50% of earned rewards if withdrawn before end date
    const isEarlyWithdrawal = staking.endDate && new Date() < staking.endDate;
    let penalty = 0;
    
    if (isEarlyWithdrawal) {
      penalty = finalRewards * 0.5; // 50% penalty on rewards for early withdrawal
      finalRewards = finalRewards - penalty;
    }
    
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

    // Log successful unstake
    await logSystemEvent({
      level: "INFO",
      source: "STAKING",
      action: "UNSTAKE_SUCCESS",
      message: `Staking clôturé: ${staking.amount} ${currency} + ${finalRewards.toFixed(4)} récompenses`,
      userId,
      details: {
        stakingId,
        principal: staking.amount,
        rewards: finalRewards,
        penalty,
        total: totalAmount,
        daysStaked,
        apy: staking.apy,
        isEarlyWithdrawal
      }
    });

    // Create notification with full details (like swap does)
    const notificationMessage = isEarlyWithdrawal
      ? `Retrait anticipe : ${staking.amount.toFixed(2)} ${currency} + ${finalRewards.toFixed(4)} ${currency} de recompenses (penalite: ${penalty.toFixed(4)} ${currency})`
      : `Staking cloture : ${staking.amount.toFixed(2)} ${currency} + ${finalRewards.toFixed(4)} ${currency} de recompenses apres ${daysStaked} jours`;

    await prisma.notification.create({
      data: {
        userId,
        title: isEarlyWithdrawal ? "Retrait anticipe effectue !" : "Staking cloture !",
        message: notificationMessage,
        type: "STAKING_UNSTAKE",
        metadata: {
          type: "UNSTAKE",
          stakingId,
          stakingAmount: staking.amount,
          rewardAmount: finalRewards,
          amount: totalAmount,
          principal: staking.amount,
          rewards: finalRewards,
          penalty,
          total: totalAmount,
          daysStaked,
          duration: `${daysStaked} jours`,
          apy: staking.apy,
          currency,
          isEarlyWithdrawal,
          stakingStatus: "COMPLETED",
          reference: `UNSTK-${Date.now()}`
        }
      }
    }).catch((err) => {
      console.error("Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      message: isEarlyWithdrawal 
        ? "Retrait anticipé effectué avec pénalité de 50% sur les récompenses" 
        : "Staking clôturé avec succès",
      details: {
        principal: staking.amount,
        rewards: finalRewards,
        penalty,
        total: totalAmount,
        daysStaked,
        apy: staking.apy,
        currency,
        isEarlyWithdrawal
      }
    });

  } catch (error: any) {
    console.error("❌ [UNSTAKE_ERROR]:", error.message);
    try {
      await logSystemEvent({
        level: "ERROR",
        source: "STAKING",
        action: "UNSTAKE_ERROR",
        message: `Erreur unstake: ${error.message}`,
        details: { error: error.message }
      });
    } catch {
      // Ignore logging errors
    }
    return NextResponse.json({ error: "Impossible de clôturer le staking" }, { status: 500 });
  }
}
