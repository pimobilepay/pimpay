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

// GET - Fetch user's staking positions and stats
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
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

  } catch (error: any) {
    console.error("❌ [STAKING_FETCH_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger les stakes" }, { status: 500 });
  }
}

// POST - Create a new staking position
export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, poolId, lockDays } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Define pool configurations
    const pools: Record<string, { apy: number; minAmount: number; currency: string }> = {
      'pi-flexible': { apy: 8.5, minAmount: 10, currency: 'PI' },
      'pi-locked': { apy: 14.2, minAmount: 50, currency: 'PI' },
      'sda-staking': { apy: 12.0, minAmount: 100, currency: 'SDA' }
    };

    const pool = pools[poolId];
    if (!pool) {
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

    return NextResponse.json({
      success: true,
      message: "Staking créé avec succès",
      staking: {
        id: staking.id,
        amount: staking.amount,
        apy: staking.apy,
        startDate: staking.startDate,
        endDate: staking.endDate,
        estimatedAnnualReward: amount * pool.apy / 100
      }
    });

  } catch (error: any) {
    console.error("❌ [STAKING_CREATE_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de créer le staking" }, { status: 500 });
  }
}
