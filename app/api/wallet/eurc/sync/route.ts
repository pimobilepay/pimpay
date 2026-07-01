export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/eurc/sync
 * Synchronise le solde EURC (Euro Coin, ERC20 sur Ethereum) avec le solde réel on-chain.
 * Utilise l'adresse EVM (sidraAddress), comme les autres stablecoins EVM.
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
        where: { userId_currency: { userId, currency: "EURC" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse EVM configurée",
      });
    }

    const blockchainBalance = await getEvmTokenBalance(user.sidraAddress, "EURC");
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "EURC" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau Ethereum indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "EURC",
      blockchainBalance,
      network: "Ethereum (ERC20)",
      source: "ETH_MAINNET",
      decimals: 4,
      minDeposit: 0.01,
      extraMetadata: { contractAddress: BSC_TOKENS.EURC.contract },
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation EURC réussie (+${result.added.toFixed(4)} EURC)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[EURC_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation EURC" },
      { status: 500 }
    );
  }
}
