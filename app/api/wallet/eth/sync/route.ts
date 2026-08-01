export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/eth/sync
 *
 * Synchronise le solde ETH (Ethereum Mainnet) avec le solde reel on-chain.
 * Utilise l'adresse EVM de l'utilisateur (sidraAddress), comme BNB.
 *
 * ⚠️ Cette route manquait : les depots ETH n'etaient JAMAIS credites alors que
 * le retrait ETH etait deja operationnel (broadcast EVM dans /api/user/transfer).
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
        message: "Aucune adresse EVM configuree",
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
        message: "Reseau Ethereum indisponible, reessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "ETH",
      blockchainBalance,
      network: "Ethereum",
      source: "ETH_MAINNET",
      decimals: 8,
      // Seuil anti-dust : en dessous de 0.00001 ETH on credite sans notifier
      minDeposit: 0.00001,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation ETH reussie (+${result.added.toFixed(8)} ETH)`
          : "Solde deja a jour",
    });
  } catch (err: any) {
    console.error("[ETH_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation ETH" },
      { status: 500 }
    );
  }
}
