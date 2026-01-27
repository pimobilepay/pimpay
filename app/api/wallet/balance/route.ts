export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { ethers } from "ethers";

const SIDRA_RPC = "https://rpc.sidrachain.com";

export async function GET() {
  try {
    // 1. Vérification du Secret JWT
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("JWT_SECRET is missing");
      return NextResponse.json({ error: "Erreur configuration" }, { status: 500 });
    }

    // 2. Récupération du token Pimpay
    const token = cookies().get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 3. Vérification du token
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // 4. Récupération de l'utilisateur et de TOUS ses wallets Pimpay
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sidraAddress: true,
        wallets: true, // On récupère tous les wallets (PI, USDT, BTC, etc.)
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 5. RÉCUPÉRATION DU SOLDE RÉEL SDA (Blockchain Sidra)
    let sdaBalance = "0.0";
    if (user.sidraAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        const balanceRaw = await provider.getBalance(user.sidraAddress);
        sdaBalance = ethers.formatEther(balanceRaw);

        // Synchronisation de la DB Pimpay avec la réalité blockchain
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { balance: parseFloat(sdaBalance) },
          create: { userId, currency: "SDA", balance: parseFloat(sdaBalance), type: "SIDRA" }
        });
      } catch (rpcError) {
        console.error("RPC ERROR (Sidra):", rpcError);
        // Si le RPC échoue, on tente de récupérer la dernière valeur connue en DB
        const existingSda = user.wallets.find(w => w.currency === "SDA");
        if (existingSda) sdaBalance = existingSda.balance.toString();
      }
    }

    // 6. Construction de l'objet balances pour le Frontend
    // On transforme le tableau de wallets en un objet indexé par currency
    const balancesMap = user.wallets.reduce((acc, wallet) => {
      acc[wallet.currency] = wallet.balance.toString();
      return acc;
    }, {} as Record<string, string>);

    // On force la valeur SDA récupérée de la blockchain dans l'objet
    balancesMap["SDA"] = sdaBalance;

    // 7. Réponse combinée pour Pimpay
    return NextResponse.json({
      ...balancesMap, // On étale l'objet pour avoir PI, USDT, BTC au premier niveau
      PI: balancesMap["PI"] || "0.0000",
      USDT: balancesMap["USDT"] || "0.00",
      SDA: sdaBalance,
      address: user.sidraAddress,
      status: "success"
    });

  } catch (error: any) {
    console.error("BALANCE_FETCH_ERROR:", error);
    if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWS_INVALID') {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
