export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

const DEFAULT_OPERATOR_ADDRESS = "GCD7XUKTQPYDNJL2XJDIHNDUEVRXY7VOGLBD75WAE2DAAGPXP2GAJFBB";

async function getPiRuntime() {
  let network = process.env.PI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { piNetwork: true } as any,
    });
    network = (config as any)?.piNetwork === "mainnet" ? "mainnet" : "testnet";
  } catch { /* fallback env */ }

  const isMainnet = network === "mainnet";
  return {
    network,
    address: isMainnet
      ? process.env.PI_MASTER_WALLET_ADDRESS_MAINNET || process.env.PI_WALLET_PUBLIC_KEY_MAINNET || DEFAULT_OPERATOR_ADDRESS
      : process.env.PI_WALLET_PUBLIC_KEY || process.env.PI_OPERATOR_ADDRESS || DEFAULT_OPERATOR_ADDRESS,
    horizonUrl: isMainnet
      ? process.env.PI_HORIZON_URL_MAINNET || "https://api.mainnet.minepi.com"
      : process.env.PI_HORIZON_URL || "https://api.testnet.minepi.com",
  };
}

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

    const runtime = await getPiRuntime();
    // 1. Lecture du solde du réseau actuellement sélectionné
    let onChainBalance = 0;
    let onChainError: string | null = null;
    let network = runtime.network;

    {
      const result = await fetchBalanceFromHorizon(runtime.horizonUrl, runtime.address);
      network = result.network;

      if (result.error === null) {
        onChainBalance = result.balance;
        onChainError = null;
      } else {
        onChainBalance = result.balance;
        onChainError = result.error;
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
      address: runtime.address,
      balance: onChainBalance,
      totalUsersPi,
      usersCount,
      coverage,
      network,
      onChainError,
      explorerUrl: `${PI_EXPLORER}/account/${runtime.address}`,
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
