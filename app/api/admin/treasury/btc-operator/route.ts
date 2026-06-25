export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { getBtcBalance } from "@/lib/blockchain/balances";

// Adresse du wallet opérateur Bitcoin — à renseigner dans les variables d'environnement
const BTC_OPERATOR_ADDRESS = process.env.BTC_OPERATOR_ADDRESS || "";

// Explorer Bitcoin (mempool.space)
const BTC_EXPLORER = "https://mempool.space/address";

export async function GET(req: NextRequest) {
  try {
    // Vérification admin
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const address = BTC_OPERATOR_ADDRESS;

    // 1. Lecture du solde on-chain via mempool.space / blockstream
    let balance = 0;
    let onChainError: string | null = null;

    if (!address) {
      onChainError = "Adresse BTC non configurée (BTC_OPERATOR_ADDRESS)";
    } else {
      const onChain = await getBtcBalance(address);
      if (onChain === null) {
        onChainError = "Impossible de lire le solde on-chain (API Bitcoin injoignable)";
      } else {
        balance = onChain;
      }
    }

    // 2. Total BTC détenu par les utilisateurs en base de données
    const btcWallets = await prisma.wallet.aggregate({
      where: { currency: "BTC" },
      _sum: { balance: true },
      _count: { id: true },
    });
    const totalUsersBTC = Number(btcWallets._sum.balance ?? 0);
    const usersCount = btcWallets._count.id ?? 0;

    // 3. Calcul du taux de couverture
    const coverage =
      totalUsersBTC > 0
        ? Math.min((balance / totalUsersBTC) * 100, 999)
        : 100;

    return NextResponse.json({
      success: true,
      address,
      balance,
      totalUsersBTC,
      usersCount,
      coverage,
      onChainError,
      explorerUrl: address ? `${BTC_EXPLORER}/${address}` : "",
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[btc-operator] Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
