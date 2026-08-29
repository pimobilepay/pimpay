export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/doge/sync
 *
 * Synchronise le solde DOGE du wallet PIMOBIPAY avec le solde réel on-chain.
 *
 * ⚠️ AVANT CORRECTION : DOGE n'avait aucune adresse dédiée en base (aucun
 * champ `dogeAddress` sur User), aucune fonction de lecture de solde et
 * aucune route de sync. L'UI affichait par erreur l'adresse EVM comme
 * "adresse de dépôt DOGE" — un format invalide sur le réseau Dogecoin — donc
 * tout dépôt DOGE réel était irrécupérable et jamais crédité.
 *
 * Cette route :
 *   1. Génère (une seule fois) une vraie adresse Dogecoin P2PKH + clé privée
 *      chiffrée, comme le fait déjà /api/wallet/balance pour BTC/SOL/XRP/XLM.
 *   2. Lit le solde on-chain réel via lib/blockchain/dogecoin.ts.
 *   3. Crédite le wallet via creditOnchainDeposit (idempotent, préserve les
 *      crédits internes P2P/swap déjà présents en base).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getDogeBalance, generateDogeWallet } from "@/lib/blockchain/dogecoin";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";
import { encrypt } from "@/lib/encryption";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dogeAddress: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    let dogeAddress = user.dogeAddress;
    if (!dogeAddress) {
      const generated = generateDogeWallet();
      const updated = await prisma.user.updateMany({
        where: { id: userId, dogeAddress: null },
        data: {
          dogeAddress: generated.address,
          dogePrivateKey: encrypt(generated.privateKeyWIF),
        },
      });
      dogeAddress = updated.count > 0
        ? generated.address
        : (await prisma.user.findUnique({ where: { id: userId }, select: { dogeAddress: true } }))?.dogeAddress;
    }

    if (!dogeAddress) {
      return NextResponse.json({ error: "Adresse Dogecoin utilisateur absente" }, { status: 422 });
    }

    const blockchainBalance = await getDogeBalance(dogeAddress);
    if (blockchainBalance === null) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "DOGE" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Réseau Dogecoin indisponible, réessayez plus tard",
      });
    }

    const result = await creditOnchainDeposit({
      userId,
      currency: "DOGE",
      blockchainBalance,
      network: "BSC (BEP20)",
      source: "BSC_MAINNET",
      decimals: 8,
      minDeposit: 0.01,
      extraMetadata: { contractAddress: BSC_TOKENS.DOGE.contract },
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      message:
        result.added > 0
          ? `Synchronisation DOGE réussie (+${result.added.toFixed(6)} DOGE)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[DOGE_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation DOGE" },
      { status: 500 }
    );
  }
}
