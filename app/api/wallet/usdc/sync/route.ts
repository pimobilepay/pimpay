export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/usdc/sync
 * Synchronise le solde USDC (BEP20 sur BSC) avec le solde réel on-chain.
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
        where: { userId_currency: { userId, currency: "USDC" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse EVM configurée",
      });
    }

    const blockchainBalance = await getEvmTokenBalance(user.sidraAddress, "USDC");
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDC" } },
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
      currency: "USDC",
      blockchainBalance,
      network: "BSC (BEP20)",
      source: "BSC_MAINNET",
      decimals: 4,
      minDeposit: 0.01,
      extraMetadata: { contractAddress: BSC_TOKENS.USDC.contract },
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation USDC réussie (+${result.added.toFixed(4)} USDC)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[USDC_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation USDC" },
      { status: 500 }
    );
  }
}
