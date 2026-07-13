export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/sol/sync
 * Synchronise le solde SOL du wallet PIMOBIPAY avec le solde réel on-chain.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getSolBalance } from "@/lib/blockchain/balances";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { solAddress: true },
    });

    if (!user?.solAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "SOL" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse SOL configurée",
      });
    }

    const blockchainBalance = await getSolBalance(user.solAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "SOL" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau Solana indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "SOL",
      blockchainBalance,
      network: "Solana",
      source: "SOLANA_MAINNET",
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
          ? `Synchronisation SOL réussie (+${result.added.toFixed(8)} SOL)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[SOL_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation SOL" },
      { status: 500 }
    );
  }
}
