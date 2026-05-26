export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Adresse du wallet opérateur central Pi Network (Mainnet)
const PI_OPERATOR_ADDRESS =
  process.env.PI_OPERATOR_ADDRESS ||
  "GCD7XUKTQPYDNJL2XJDIHNDUEVRXY7VOGLBD75WAE2DAAGPXP2GAJFBB";

// Pi Network Mainnet Horizon API
const PI_HORIZON_URL = "https://api.mainnet.minepi.com";

// Pi Network Explorer
const PI_EXPLORER = "https://blockexplorer.minepi.com";

export async function GET(req: NextRequest) {
  try {
    // Vérification admin
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Lecture du solde on-chain depuis Pi Network Mainnet
    let onChainBalance = 0;
    let onChainError: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        `${PI_HORIZON_URL}/accounts/${PI_OPERATOR_ADDRESS}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          onChainError = "Compte non trouvé sur Pi Network";
        } else {
          onChainError = `Erreur API Pi Network: ${response.status}`;
        }
      } else {
        const accountData = await response.json();
        
        // Trouver le solde natif (PI)
        const nativeBalance = accountData.balances?.find(
          (b: { asset_type: string }) => b.asset_type === "native"
        );
        
        if (nativeBalance) {
          onChainBalance = parseFloat(nativeBalance.balance);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        onChainError = "Timeout API Pi Network (10s)";
      } else {
        onChainError = err?.message ?? "Erreur de connexion à Pi Network";
      }
      console.error("[pi-operator] Erreur API:", onChainError);
    }

    // 2. Total PI détenu par les utilisateurs en base de données
    const piWallets = await prisma.wallet.aggregate({
      where: { currency: "PI" },
      _sum: { balance: true },
      _count: { id: true },
    });

    const totalUsersPi = piWallets._sum.balance ?? 0;
    const usersCount = piWallets._count.id ?? 0;

    // 3. Calcul du taux de couverture
    const coverage =
      totalUsersPi > 0
        ? Math.min((onChainBalance / totalUsersPi) * 100, 999)
        : 100; // Si personne n'a de PI, couverture 100%

    return NextResponse.json({
      success: true,
      address: PI_OPERATOR_ADDRESS,
      balance: onChainBalance,
      totalUsersPi,
      usersCount,
      coverage,
      onChainError,
      explorerUrl: `${PI_EXPLORER}/account/${PI_OPERATOR_ADDRESS}`,
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[pi-operator] Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
