export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Adresse du wallet opérateur central SDA (Sidra Chain)
const SDA_OPERATOR_ADDRESS =
  process.env.SDA_OPERATOR_ADDRESS ||
  "0xe72cC1d1698497440D06B1256216CEEad07Ea3DB";

// RPC Sidra Chain
const SIDRA_RPC = "https://node.sidrachain.com";

// Explorer Sidra Chain
const SIDRA_EXPLORER = "https://explorer.sidrachain.com";

export async function GET(req: NextRequest) {
  try {
    // Vérification admin
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Lecture du solde on-chain depuis la Sidra Chain
    let onChainBalance = 0;
    let onChainError: string | null = null;

    try {
      const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
      // Timeout de 10 secondes pour éviter les blocages
      const balancePromise = provider.getBalance(SDA_OPERATOR_ADDRESS);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout RPC (10s)")), 10_000)
      );
      const rawBalance = await Promise.race([balancePromise, timeoutPromise]);
      onChainBalance = parseFloat(ethers.formatEther(rawBalance));
    } catch (err: any) {
      onChainError = err?.message ?? "Erreur de connexion au nœud Sidra";
      console.error("[sidra-operator] Erreur RPC:", onChainError);
    }

    // 2. Total SDA détenu par les utilisateurs en base de données
    const sdaWallets = await prisma.wallet.aggregate({
      where: { currency: "SDA" },
      _sum: { balance: true },
      _count: { id: true },
    });

    const totalUsersSDA = sdaWallets._sum.balance ?? 0;
    const usersCount = sdaWallets._count.id ?? 0;

    // 3. Calcul du taux de couverture
    const coverage =
      totalUsersSDA > 0
        ? Math.min((onChainBalance / totalUsersSDA) * 100, 999)
        : 100; // Si personne n'a de SDA, couverture 100%

    return NextResponse.json({
      success: true,
      address: SDA_OPERATOR_ADDRESS,
      balance: onChainBalance,
      totalUsersSDA,
      usersCount,
      coverage,
      onChainError,
      explorerUrl: `${SIDRA_EXPLORER}/address/${SDA_OPERATOR_ADDRESS}`,
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[sidra-operator] Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
