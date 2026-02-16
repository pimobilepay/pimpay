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
    
    // --- LE VACCIN : RÉCUPÉRATION HYBRIDE ---
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
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- RÉCUPÉRATION DE L'UTILISATEUR ET SES WALLETS ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        sidraAddress: true,
        usdtAddress: true,
        wallets: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // --- RÉCUPÉRATION DU SOLDE RÉEL SDA (Blockchain Sidra) ---
    let sdaBalanceValue = 0;
    if (user.sidraAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        // On limite le temps d'attente pour ne pas bloquer Vercel (timeout 3s)
        const balanceRaw = await Promise.race([
          provider.getBalance(user.sidraAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
        ]) as bigint;

        const formattedSda = ethers.formatEther(balanceRaw);
        sdaBalanceValue = parseFloat(formattedSda);

        // Synchronisation asynchrone pour ne pas ralentir la réponse
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { balance: sdaBalanceValue },
          create: { userId, currency: "SDA", balance: sdaBalanceValue, type: "SIDRA" }
        });
      } catch (rpcError) {
        console.error("RPC ERROR (Sidra):", rpcError);
        // Récupération de la dernière valeur connue en DB si le RPC échoue
        const existingSda = user.wallets.find(w => w.currency === "SDA");
        if (existingSda) sdaBalanceValue = existingSda.balance;
      }
    }

    // --- CONSTRUCTION DE LA RÉPONSE ---
    const balancesMap = user.wallets.reduce((acc, wallet) => {
      // Normaliser SIDRA -> SDA pour le frontend
      const key = wallet.currency === "SIDRA" ? "SDA" : wallet.currency;
      acc[key] = wallet.balance.toFixed(4);
      return acc;
    }, {} as Record<string, string>);

    // On s'assure que SDA est à jour dans l'objet final
    balancesMap["SDA"] = sdaBalanceValue.toFixed(4);

    // Récupérer l'adresse BTC depuis le wallet BTC (depositMemo)
    const btcWallet = user.wallets.find(w => w.currency === "BTC");

    return NextResponse.json({
      success: true,
      ...balancesMap,
      PI: balancesMap["PI"] || "0.0000",
      USDT: balancesMap["USDT"] || "0.00",
      BTC: balancesMap["BTC"] || "0.00000000",
      SDA: balancesMap["SDA"],
      addresses: {
        PI: user.walletAddress || "",
        SDA: user.sidraAddress || "",
        USDT: user.usdtAddress || "",
        BTC: btcWallet?.depositMemo || "",
      },
      wallets: user.wallets.map(w => ({
        currency: w.currency === "SIDRA" ? "SDA" : w.currency,
        balance: w.balance,
        depositMemo: w.depositMemo,
        type: w.type,
      })),
    });

  } catch (error: any) {
    console.error("BALANCE_FETCH_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
