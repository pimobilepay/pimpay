export const dynamic = 'force-dynamic';
import { getErrorMessage } from '@/lib/error-utils';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { logSystemEvent } from "@/lib/systemLogger";

// GET - Fetch user's staking positions and stats
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch all staking positions for the user
    const stakings = await prisma.staking.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' }
    });

    // Calculate stats
    const activeStakings = stakings.filter(s => s.isActive);
    const totalStaked = activeStakings.reduce((sum, s) => sum + s.amount, 0);
    const totalRewards = stakings.reduce((sum, s) => sum + s.rewardsEarned, 0);
    const maxApy = activeStakings.length > 0 ? Math.max(...activeStakings.map(s => s.apy)) : 0;

    // Format stakings for response
    const formattedStakings = stakings.map(s => ({
      id: s.id,
      amount: s.amount,
      apy: s.apy,
      startDate: s.startDate,
      endDate: s.endDate,
      isActive: s.isActive,
      rewardsEarned: s.rewardsEarned,
      // Calculate estimated annual reward
      estimatedAnnualReward: s.isActive ? (s.amount * s.apy / 100) : 0,
      // Calculate days staked
      daysStaked: Math.floor((Date.now() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24))
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalStaked,
        totalRewards,
        maxApy,
        activeCount: activeStakings.length
      },
      stakings: formattedStakings
    });

  } catch (error: unknown) {
    console.error("❌ [STAKING_FETCH_ERROR]:", getErrorMessage(error));
    return NextResponse.json({ error: "Impossible de charger les stakes" }, { status: 500 });
  }
}

// POST - Create a new staking position
export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, poolId, lockDays } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Define pool configurations (match IDs from staking page)
    const pools: Record<string, { apy: number; minAmount: number; currency: string }> = {
      'pi-flex': { apy: 8.5, minAmount: 1, currency: 'PI' },
      'pi-locked': { apy: 14.2, minAmount: 10, currency: 'PI' },
      'sda-staking': { apy: 12.0, minAmount: 100, currency: 'SDA' }
    };

    const pool = pools[poolId];
    if (!pool) {
      await logSystemEvent({
        level: "WARN",
        source: "STAKING",
        action: "INVALID_POOL",
        message: `Tentative de staking avec pool invalide: ${poolId}`,
        userId,
        details: { poolId, amount, currency }
      });
      return NextResponse.json({ error: "Pool de staking invalide" }, { status: 400 });
    }

    if (amount < pool.minAmount) {
      return NextResponse.json({ 
        error: `Montant minimum: ${pool.minAmount} ${pool.currency}` 
      }, { status: 400 });
    }

    // Check user's wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: { userId, currency: pool.currency }
    });

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ 
        error: `Solde ${pool.currency} insuffisant` 
      }, { status: 400 });
    }

    // Calculate end date for locked staking
    const endDate = lockDays ? new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000) : null;

    // Create staking position and deduct from wallet in a transaction
    const [staking] = await prisma.$transaction([
      prisma.staking.create({
        data: {
          userId,
          amount,
          apy: pool.apy,
          endDate,
          isActive: true,
          rewardsEarned: 0
        }
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } }
      }),
      prisma.transaction.create({
        data: {
          reference: `STK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount,
          currency: pool.currency,
          type: 'TRANSFER',
          status: 'SUCCESS',
          description: `Staking ${pool.currency} - ${pool.apy}% APY`,
          fromUserId: userId,
          fromWalletId: wallet.id
        }
      })
    ]);

    // Log successful staking
    await logSystemEvent({
      level: "INFO",
      source: "STAKING",
      action: "STAKE_CREATED",
      message: `Staking de ${amount} ${pool.currency} créé avec succès`,
      userId,
      details: { 
        stakingId: staking.id, 
        amount, 
        currency: pool.currency, 
        apy: pool.apy, 
        poolId,
        walletId: wallet.id 
      }
    });

    // Create notification with full details (like swap does)
    const endDateFormatted = endDate 
      ? new Date(endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Flexible';
    
    const durationLabel = lockDays 
      ? `${lockDays} jours` 
      : 'Flexible';
    
    await prisma.notification.create({
      data: {
        userId,
        title: "Staking active !",
        message: `Vous avez mis ${amount} ${pool.currency} en staking a ${pool.apy}% APY. Fin prevue: ${endDateFormatted}`,
        type: "STAKING",
        metadata: {
          type: "STAKING",
          stakingId: staking.id,
          stakingAmount: amount,
          amount,
          currency: pool.currency,
          apy: pool.apy,
          poolId,
          lockDays: lockDays || 0,
          duration: durationLabel,
          startDate: staking.startDate.toISOString(),
          endDate: staking.endDate?.toISOString() || null,
          unlockDate: endDateFormatted,
          estimatedAnnualReward: amount * pool.apy / 100,
          reference: `STK-${staking.id.substring(0, 8)}`,
          stakingStatus: "ACTIVE"
        }
      }
    }).catch((err) => {
      console.error("Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Staking créé avec succès",
      staking: {
        id: staking.id,
        amount: staking.amount,
        apy: staking.apy,
        startDate: staking.startDate,
        endDate: staking.endDate,
        estimatedAnnualReward: amount * pool.apy / 100,
        currency: pool.currency,
        lockDays: lockDays || 0
      }
    });

  } catch (error: unknown) {
    console.error("❌ [STAKING_CREATE_ERROR]:", getErrorMessage(error));
    try {
      await logSystemEvent({
        level: "ERROR",
        source: "STAKING",
        action: "STAKE_ERROR",
        message: `Erreur création staking: ${getErrorMessage(error)}`,
        details: { error: getErrorMessage(error), stack: (error as Error)?.stack?.substring(0, 500) }
      });
    } catch {
      // Ignore logging errors
    }
    return NextResponse.json({ error: "Impossible de créer le staking" }, { status: 500 });
  }
}
