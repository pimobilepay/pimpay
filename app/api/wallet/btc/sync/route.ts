export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/btc/sync
 * Synchronise le solde BTC du wallet PimPay avec le solde réel on-chain.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getBtcBalance } from "@/lib/blockchain/balances";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    if (!user?.walletAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "BTC" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse BTC configurée",
      });
    }

    const blockchainBalance = await getBtcBalance(user.walletAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "BTC" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau Bitcoin indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "BTC",
      blockchainBalance,
      network: "Bitcoin",
      source: "BTC_MAINNET",
      decimals: 8,
      minDeposit: 0.000001,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation BTC réussie (+${result.added.toFixed(8)} BTC)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[BTC_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation BTC" },
      { status: 500 }
    );
  }
}
