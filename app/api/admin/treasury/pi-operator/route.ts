export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Adresse du wallet opérateur central Pi Network (Mainnet)
// Utilise PI_WALLET_PUBLIC_KEY en priorité, puis PI_OPERATOR_ADDRESS comme fallback
const PI_OPERATOR_ADDRESS =
  process.env.PI_WALLET_PUBLIC_KEY ||
  process.env.PI_OPERATOR_ADDRESS ||
  "GCD7XUKTQPYDNJL2XJDIHNDUEVRXY7VOGLBD75WAE2DAAGPXP2GAJFBB";

// Pi Network Horizon APIs (essaie mainnet puis testnet)
const PI_HORIZON_URLS = [
  "https://api.mainnet.minepi.com",
  "https://api.testnet.minepi.com",
];

// Pi Network Explorer
const PI_EXPLORER = "https://blockexplorer.minepi.com";

// Fonction pour tenter de récupérer le solde depuis une URL Horizon
async function fetchBalanceFromHorizon(
  url: string,
  address: string
): Promise<{ balance: number; error: string | null; network: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    const response = await fetch(`${url}/accounts/${address}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          balance: 0,
          error: "Compte non activé (aucune transaction)",
          network: url.includes("testnet") ? "testnet" : "mainnet",
        };
      }
      return {
        balance: 0,
        error: `Erreur HTTP ${response.status}`,
        network: url.includes("testnet") ? "testnet" : "mainnet",
      };
    }

    const accountData = await response.json();
    const nativeBalance = accountData.balances?.find(
      (b: { asset_type: string }) => b.asset_type === "native"
    );

    return {
      balance: nativeBalance ? parseFloat(nativeBalance.balance) : 0,
      error: null,
      network: url.includes("testnet") ? "testnet" : "mainnet",
    };
  } catch (err: any) {
    return {
      balance: 0,
      error: err.name === "AbortError" ? "Timeout (8s)" : err.message,
      network: url.includes("testnet") ? "testnet" : "mainnet",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    // Vérification admin
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Lecture du solde on-chain - essaie mainnet puis testnet
    let onChainBalance = 0;
    let onChainError: string | null = null;
    let network = "mainnet";

    for (const horizonUrl of PI_HORIZON_URLS) {
      const result = await fetchBalanceFromHorizon(horizonUrl, PI_OPERATOR_ADDRESS);
      network = result.network;

      if (result.error === null) {
        // Succès - on a trouvé le compte
        onChainBalance = result.balance;
        onChainError = null;
        break;
      } else if (result.balance > 0) {
        // Le compte existe mais avec une erreur partielle
        onChainBalance = result.balance;
        onChainError = result.error;
        break;
      }

      // Garde la dernière erreur
      onChainError = result.error;
      
      // Si c'est juste un compte non activé sur mainnet, on continue vers testnet
      if (result.error?.includes("non activé")) {
        continue;
      }
    }

    // Si aucune erreur de réseau mais solde 0, c'est peut-être un compte non activé
    if (onChainBalance === 0 && onChainError?.includes("non activé")) {
      onChainError = "Compte non activé - effectuez une première transaction pour activer";
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
      network,
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
