export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/eth/sync
 * Synchronise le solde ETH (Ethereum Mainnet) du wallet PIMOBIPAY avec le
 * solde réel on-chain. L'adresse EVM (sidraAddress) est identique sur toutes
 * les chaînes EVM, elle est donc réutilisée ici comme pour BNB.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getEthBalance } from "@/lib/blockchain/balances";
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
        where: { userId_currency: { userId, currency: "ETH" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse EVM configurée",
      });
    }

    const blockchainBalance = await getEthBalance(user.sidraAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "ETH" } },
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
      currency: "ETH",
      blockchainBalance,
      network: "Ethereum (ERC20)",
      source: "ETHEREUM_MAINNET",
      decimals: 8,
      minDeposit: 0.00000001,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation ETH réussie (+${result.added.toFixed(8)} ETH)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[ETH_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation ETH" },
      { status: 500 }
    );
  }
}
