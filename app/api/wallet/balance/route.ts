export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { ethers } from "ethers";

const SIDRA_RPC = "https://rpc.sidrachain.com";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // --- AUTH: Hybrid token recovery ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;
    const SECRET = process.env.JWT_SECRET;

    if (piToken) {
      userId = piToken;
    } else if (classicToken && SECRET) {
      try {
        const secretKey = new TextEncoder().encode(SECRET);
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- Fetch user with wallets (only safe fields) ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        sidraAddress: true,
        xrpAddress: true,
        xlmAddress: true,
        solAddress: true,
        usdtAddress: true,
        wallets: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const usdtAddress = user.usdtAddress || "";

    // --- Fetch real SDA balance from Sidra blockchain ---
    let sdaBalanceValue = 0;
    if (user.sidraAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        const balanceRaw = await Promise.race([
          provider.getBalance(user.sidraAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
        ]) as bigint;

        const formattedSda = ethers.formatEther(balanceRaw);
        sdaBalanceValue = parseFloat(formattedSda);

        // Sync SDA balance to DB (currency: "SDA", type: "SIDRA")
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { balance: sdaBalanceValue },
          create: { userId, currency: "SDA", balance: sdaBalanceValue, type: "SIDRA" }
        }).catch(() => null);
      } catch (rpcError) {
        console.error("RPC ERROR (Sidra):", rpcError);
        // Fallback to last known DB value
        const existingSda = user.wallets.find(w => w.currency === "SDA" || w.currency === "SIDRA");
        if (existingSda) sdaBalanceValue = existingSda.balance;
      }
    } else {
      const existingSda = user.wallets.find(w => w.currency === "SDA" || w.currency === "SIDRA");
      if (existingSda) sdaBalanceValue = existingSda.balance;
    }

    // --- Build balances map from all wallets ---
    const balancesMap: Record<string, string> = {};
    for (const wallet of user.wallets) {
      // Normalize SIDRA -> SDA for frontend
      const key = wallet.currency === "SIDRA" ? "SDA" : wallet.currency;
      balancesMap[key] = wallet.balance.toFixed(8);
    }

    // Ensure SDA is up to date
    balancesMap["SDA"] = sdaBalanceValue.toFixed(4);

    // Find wallet addresses from depositMemo
    const btcWallet = user.wallets.find(w => w.currency === "BTC");

    // --- Build addresses map using group logic ---
    // EVM Group: ETH, BNB, SDA, MATIC, USDC, DAI, BUSD share sidraAddress
    const evmAddress = user.sidraAddress || "";
    // Stellar Group: PI, XLM share xlmAddress  
    const stellarAddress = user.xlmAddress || "";
    // Tron Group: TRX, USDT share usdtAddress
    const tronAddress = usdtAddress;
    // Unique: SOL uses solAddress
    const solAddr = user.solAddress || "";

    return NextResponse.json({
      success: true,
      ...balancesMap,
      PI: balancesMap["PI"] || "0.0000",
      USDT: balancesMap["USDT"] || "0.00",
      BTC: balancesMap["BTC"] || "0.00000000",
      SDA: balancesMap["SDA"],
      ETH: balancesMap["ETH"] || "0.00000000",
      BNB: balancesMap["BNB"] || "0.00000000",
      SOL: balancesMap["SOL"] || "0.00000000",
      TRX: balancesMap["TRX"] || "0.000000",
      ADA: balancesMap["ADA"] || "0.000000",
      DOGE: balancesMap["DOGE"] || "0.000000",
      TON: balancesMap["TON"] || "0.000000",
      USDC: balancesMap["USDC"] || "0.0000",
      DAI: balancesMap["DAI"] || "0.0000",
      BUSD: balancesMap["BUSD"] || "0.0000",
      XRP: balancesMap["XRP"] || "0.000000",
      XLM: balancesMap["XLM"] || "0.0000000",
      XAF: balancesMap["XAF"] || "0.00",
      MATIC: balancesMap["MATIC"] || "0.00000000",
      addresses: {
        // Stellar / Pi Network group
        PI: user.walletAddress || stellarAddress,
        XLM: stellarAddress,
        // EVM group (shared sidraAddress)
        SDA: evmAddress,
        ETH: evmAddress,
        BNB: evmAddress,
        MATIC: evmAddress,
        USDC: evmAddress,
        DAI: evmAddress,
        BUSD: evmAddress,
        ADA: evmAddress,
        DOGE: evmAddress,
        TON: evmAddress,
        // Tron group (shared usdtAddress)
        USDT: tronAddress,
        TRX: tronAddress,
        // Unique chains
        BTC: btcWallet?.depositMemo || user.walletAddress || "",
        XRP: user.xrpAddress || "",
        SOL: solAddr,
      },
      wallets: user.wallets.map(w => ({
        currency: w.currency === "SIDRA" ? "SDA" : w.currency,
        balance: w.balance,
        depositMemo: w.depositMemo,
        type: w.type,
      })),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("BALANCE_FETCH_ERROR:", message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
