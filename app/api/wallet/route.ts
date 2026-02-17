export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ethers } from "ethers";

const SIDRA_RPC = "https://node.sidrachain.com";

// Fonction pour récupérer le solde réel sur la blockchain Sidra
async function getSidraBalance(address: string) {
  try {
    const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (e) {
    return 0.00;
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authentification réelle
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. Récupération de l'utilisateur avec ses wallets et sa carte depuis Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        wallets: true, 
        virtualCards: true,
        transactionsFrom: { take: 5, orderBy: { createdAt: 'desc' } },
        transactionsTo: { take: 5, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 3. Récupération du solde Sidra en temps réel
    const sdaRealBalance = user.sidraAddress ? await getSidraBalance(user.sidraAddress) : 0.00;

    // 4. Formatage des soldes pour le Front-end
    // On transforme le tableau wallets en objet balances pour ton composant Recharts/Wallet
    const balances: any = {};
    user.wallets.forEach(w => {
      // Fusion visuelle SDA / SIDRA
      const key = (w.currency === "SIDRA" || w.currency === "SDA") ? "SDA" : w.currency;
      balances[key] = { 
        balance: key === "SDA" ? sdaRealBalance : w.balance 
      };
    });

    // 5. Construction de la réponse identique à ton design
    const responseData = {
      profile: {
        name: user.name || `${user.firstName} ${user.lastName}`.trim() || user.username,
        kycStatus: user.kycStatus,
        pi_uid: user.piUserId
      },
      virtualCard: user.virtualCards[0] || {
        number: "XXXX XXXX XXXX XXXX",
        exp: "--/--",
        cvv: "***"
      },
      balances: balances,
      // On fusionne les transactions envoyées et reçues
      history: [...user.transactionsFrom, ...user.transactionsTo]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(tx => ({
          id: tx.id,
          label: tx.description || "Transaction PimPay",
          amount: tx.amount,
          direction: tx.fromUserId === userId ? "OUT" : "IN",
          currency: tx.currency,
          status: tx.status,
          date: tx.createdAt.toLocaleDateString("fr-FR")
        })),
      chart: [
        { amount: sdaRealBalance * 100 }, // Simulation pour le graphique
        { amount: (balances["USD"]?.balance || 0) },
        { amount: (balances["PI"]?.balance || 0) * 314159 }
      ]
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Erreur Wallet API:", error.message);
    return NextResponse.json({ error: "Problème de synchronisation" }, { status: 500 });
  }
}
