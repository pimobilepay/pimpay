export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/xlm/sync
 * Synchronise le solde XLM (Stellar) du wallet PIMOBIPAY avec le solde réel on-chain.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getXlmBalance } from "@/lib/blockchain/balances";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xlmAddress: true },
    });

    if (!user?.xlmAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XLM" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse XLM configurée",
      });
    }

    const blockchainBalance = await getXlmBalance(user.xlmAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XLM" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau Stellar indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "XLM",
      blockchainBalance,
      network: "Stellar",
      source: "STELLAR_MAINNET",
      decimals: 7,
      minDeposit: 0.0001,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation XLM réussie (+${result.added.toFixed(7)} XLM)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[XLM_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation XLM" },
      { status: 500 }
    );
  }
}
