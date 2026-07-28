export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig } from '@/lib/fees';

// L'agent conserve 50% des frais (aligné sur cash-in/cash-out routes)
const AGENT_SHARE = 0.5;

/**
 * GET /api/agent/fees
 * Renvoie les taux de frais utilisés par le hub pour la calculatrice de
 * commission (dépôt / retrait) et la part reversée à l'agent.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux agents' }, { status: 403 });
    }

    const config = await getFeeConfig();

    return NextResponse.json({
      success: true,
      depositFee: config.depositMobileFee, // taux appliqué au cash-in
      withdrawFee: config.withdrawMobileFee, // taux appliqué au cash-out
      agentShare: AGENT_SHARE,
      minWithdrawal: config.minWithdrawal,
      maxWithdrawal: config.maxWithdrawal,
    });
  } catch (error: any) {
    console.error('Agent Fees Error:', error.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
