export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/dai/sync
 * Synchronise le solde DAI (BEP20 sur BSC) avec le solde réel on-chain.
 * Utilise l'adresse EVM (sidraAddress), comme BNB.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getEvmTokenBalance, BSC_TOKENS } from "@/lib/blockchain/balances";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sidraAddress: true },
    });

    if (!user?.sidraAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "DAI" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse EVM configurée",
      });
    }

    const blockchainBalance = await getEvmTokenBalance(user.sidraAddress, "DAI");
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "DAI" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau BSC indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "DAI",
      blockchainBalance,
      network: "BSC (BEP20)",
      source: "BSC_MAINNET",
      decimals: 4,
      minDeposit: 0.01,
      extraMetadata: { contractAddress: BSC_TOKENS.DAI.contract },
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation DAI réussie (+${result.added.toFixed(4)} DAI)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[DAI_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation DAI" },
      { status: 500 }
    );
  }
}
