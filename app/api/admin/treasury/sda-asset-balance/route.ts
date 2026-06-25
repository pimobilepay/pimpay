export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { verifyAuth } from "@/lib/adminAuth";
import { getEvmTokenBalance } from "@/lib/blockchain/balances";

// Adresse du wallet opérateur central (partagée par les actifs EVM)
const SDA_OPERATOR_ADDRESS =
  process.env.SDA_OPERATOR_ADDRESS ||
  "0xe72cC1d1698497440D06B1256216CEEad07Ea3DB";

const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
];

const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
];

const TIMEOUT = 8000;

// Lecture du solde natif (BNB sur BSC, ETH sur Ethereum) avec fallback RPC
async function getNativeBalance(
  address: string,
  endpoints: string[]
): Promise<number | null> {
  for (const rpc of endpoints) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const raw = await Promise.race([
        provider.getBalance(address),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), TIMEOUT)
        ),
      ]);
      return parseFloat(ethers.formatEther(raw));
    } catch {
      console.warn(`[sda-asset-balance] ${rpc} failed, trying next...`);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const asset = (
      req.nextUrl.searchParams.get("asset") || ""
    ).toUpperCase();

    let balance: number | null = null;
    let network = "EVM";
    let explorerUrl = `https://bscscan.com/address/${SDA_OPERATOR_ADDRESS}`;

    switch (asset) {
      case "BNB":
        balance = await getNativeBalance(SDA_OPERATOR_ADDRESS, BSC_RPC_ENDPOINTS);
        network = "BSC";
        explorerUrl = `https://bscscan.com/address/${SDA_OPERATOR_ADDRESS}`;
        break;
      case "ETH":
        balance = await getNativeBalance(SDA_OPERATOR_ADDRESS, ETH_RPC_ENDPOINTS);
        network = "Ethereum";
        explorerUrl = `https://etherscan.io/address/${SDA_OPERATOR_ADDRESS}`;
        break;
      case "USDC":
      case "BUSD":
      case "DAI":
        balance = await getEvmTokenBalance(SDA_OPERATOR_ADDRESS, asset);
        network = "BSC";
        explorerUrl = `https://bscscan.com/address/${SDA_OPERATOR_ADDRESS}`;
        break;
      default:
        return NextResponse.json(
          { error: `Actif non supporté : ${asset}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      asset,
      network,
      address: SDA_OPERATOR_ADDRESS,
      balance,
      onChainError: balance === null ? "Lecture on-chain impossible" : null,
      explorerUrl,
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[sda-asset-balance] Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
