export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Adresse du wallet opérateur TRON — à renseigner dans vos variables d'environnement
const TRON_OPERATOR_ADDRESS =
  process.env.TRON_OPERATOR_ADDRESS || "";

// Clé API TronGrid — à renseigner dans vos variables d'environnement
const TRONGRID_API_KEY =
  process.env.TRONGRID_API_KEY || "";

// Contrat USDT TRC-20 (officiel Tether sur TRON Mainnet)
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

const TRONGRID_BASE = "https://api.trongrid.io";
const TRONSCAN_EXPLORER = "https://tronscan.org/#/address";

async function fetchTronBalances(address: string): Promise<{
  trxBalance: number;
  usdtBalance: number;
  error: string | null;
}> {
  if (!address) {
    return { trxBalance: 0, usdtBalance: 0, error: "Adresse TRON non configurée (TRON_OPERATOR_ADDRESS)" };
  }
  if (!TRONGRID_API_KEY) {
    return { trxBalance: 0, usdtBalance: 0, error: "Clé API TronGrid non configurée (TRONGRID_API_KEY)" };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "TRON-PRO-API-KEY": TRONGRID_API_KEY,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    // 1. Solde TRX natif
    const accountRes = await fetch(
      `${TRONGRID_BASE}/v1/accounts/${address}`,
      { headers, signal: controller.signal }
    );

    if (!accountRes.ok) {
      clearTimeout(timeoutId);
      return {
        trxBalance: 0,
        usdtBalance: 0,
        error: `TronGrid HTTP ${accountRes.status}`,
      };
    }

    const accountData = await accountRes.json();
    // Le solde TRX est retourné en SUN (1 TRX = 1_000_000 SUN)
    const trxBalance =
      accountData.data?.[0]?.balance != null
        ? accountData.data[0].balance / 1_000_000
        : 0;

    // 2. Solde USDT TRC-20 via TRC-20 token balance endpoint
    const usdtRes = await fetch(
      `${TRONGRID_BASE}/v1/accounts/${address}/tokens?token_id=${USDT_TRC20_CONTRACT}&limit=1`,
      { headers, signal: controller.signal }
    );

    let usdtBalance = 0;
    if (usdtRes.ok) {
      const usdtData = await usdtRes.json();
      const tokenEntry = usdtData.data?.[0];
      if (tokenEntry?.balance != null) {
        // USDT TRC-20 a 6 décimales
        usdtBalance = Number(tokenEntry.balance) / 1_000_000;
      }
    }

    clearTimeout(timeoutId);
    return { trxBalance, usdtBalance, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      trxBalance: 0,
      usdtBalance: 0,
      error: err.name === "AbortError" ? "Timeout (10s) — TronGrid injoignable" : err.message,
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

    const address = TRON_OPERATOR_ADDRESS;

    // 1. Lecture des soldes on-chain via TronGrid
    const { trxBalance, usdtBalance, error: onChainError } = await fetchTronBalances(address);

    // 2. Total TRX détenu par les utilisateurs en DB
    const trxWallets = await prisma.wallet.aggregate({
      where: { currency: "TRX" },
      _sum: { balance: true },
      _count: { id: true },
    });
    const totalUsersTRX = Number(trxWallets._sum.balance ?? 0);

    // 3. Total USDT TRC-20 détenu par les utilisateurs en DB
    const usdtWallets = await prisma.wallet.aggregate({
      where: { currency: "USDT" },
      _sum: { balance: true },
      _count: { id: true },
    });
    const totalUsersUSDT = Number(usdtWallets._sum.balance ?? 0);

    // 4. Calcul des taux de couverture
    const coverageTRX =
      totalUsersTRX > 0
        ? Math.min((trxBalance / totalUsersTRX) * 100, 999)
        : 100;
    const coverageUSDT =
      totalUsersUSDT > 0
        ? Math.min((usdtBalance / totalUsersUSDT) * 100, 999)
        : 100;

    return NextResponse.json({
      success: true,
      address,
      trxBalance,
      usdtBalance,
      totalUsersTRX,
      totalUsersUSDT,
      coverageTRX,
      coverageUSDT,
      onChainError,
      explorerUrl: `${TRONSCAN_EXPLORER}/${address}`,
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[tron-operator] Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
