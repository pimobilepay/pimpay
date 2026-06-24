export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/xrp/sync
 * Synchronise le solde XRP du wallet PimPay avec le solde réel on-chain.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getXrpBalance } from "@/lib/blockchain/balances";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xrpAddress: true },
    });

    if (!user?.xrpAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XRP" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse XRP configurée",
      });
    }

    const blockchainBalance = await getXrpBalance(user.xrpAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XRP" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "XRP Ledger indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "XRP",
      blockchainBalance,
      network: "XRP Ledger",
      source: "XRPL_MAINNET",
      decimals: 6,
      minDeposit: 0.0001,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation XRP réussie (+${result.added.toFixed(6)} XRP)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[XRP_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation XRP" },
      { status: 500 }
    );
  }
}
