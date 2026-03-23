export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch available staking pools with global stats
export async function GET() {
  try {
    // Fetch system config for APY rates
    const config = await prisma.systemConfig.findFirst({
      where: { id: "GLOBAL_CONFIG" }
    });

    const baseApy = config?.stakingAPY || 15.0;

    // Define available pools
    const pools = [
      {
        id: 'pi-flexible',
        name: 'PI Flexible',
        currency: 'PI',
        apy: 8.5,
        minAmount: 10,
        lockDays: 0,
        type: 'flexible',
        description: 'Retirez à tout moment',
        icon: '/icons/pi.svg',
        totalStaked: 0, // Will be calculated
        participants: 0
      },
      {
        id: 'pi-locked',
        name: 'PI Bloqué 30j',
        currency: 'PI',
        apy: 14.2,
        minAmount: 50,
        lockDays: 30,
        type: 'locked',
        description: 'Verrouillé 30 jours',
        icon: '/icons/pi.svg',
        totalStaked: 0,
        participants: 0
      },
      {
        id: 'sda-staking',
        name: 'SDA Staking',
        currency: 'SDA',
        apy: 12.0,
        minAmount: 100,
        lockDays: 0,
        type: 'flexible',
        description: 'Sidra Chain rewards',
        icon: '/icons/sidra.svg',
        totalStaked: 0,
        participants: 0
      }
    ];

    // Calculate real stats from active stakings
    const activeStakings = await prisma.staking.findMany({
      where: { isActive: true },
      select: { amount: true, apy: true, userId: true }
    });

    // Group by APY to match pools (simplified approach)
    const piFlexibleStakes = activeStakings.filter(s => s.apy >= 8 && s.apy < 10);
    const piLockedStakes = activeStakings.filter(s => s.apy >= 14 && s.apy < 15);
    const sdaStakes = activeStakings.filter(s => s.apy >= 11 && s.apy < 13);

    pools[0].totalStaked = piFlexibleStakes.reduce((sum, s) => sum + s.amount, 0);
    pools[0].participants = new Set(piFlexibleStakes.map(s => s.userId)).size;

    pools[1].totalStaked = piLockedStakes.reduce((sum, s) => sum + s.amount, 0);
    pools[1].participants = new Set(piLockedStakes.map(s => s.userId)).size;

    pools[2].totalStaked = sdaStakes.reduce((sum, s) => sum + s.amount, 0);
    pools[2].participants = new Set(sdaStakes.map(s => s.userId)).size;

    // Global stats
    const totalStakedGlobal = activeStakings.reduce((sum, s) => sum + s.amount, 0);
    const totalParticipants = new Set(activeStakings.map(s => s.userId)).size;
    const avgApy = activeStakings.length > 0 
      ? activeStakings.reduce((sum, s) => sum + s.apy, 0) / activeStakings.length 
      : baseApy;

    return NextResponse.json({
      success: true,
      pools,
      globalStats: {
        totalStaked: totalStakedGlobal,
        totalParticipants,
        averageApy: avgApy,
        maxApy: 14.2
      }
    });

  } catch (error: any) {
    console.error("❌ [POOLS_FETCH_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger les pools" }, { status: 500 });
  }
}
