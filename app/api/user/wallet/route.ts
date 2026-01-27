import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
// Correction de l'import pour la version 6.1.1 de TronWeb
import { TronWeb } from 'tronweb'; 

// Force le rendu dynamique pour éviter les erreurs de build statique
export const dynamic = 'force-dynamic';

// Initialisation du client TronWeb (Mainnet)
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const SIDRA_RPC = "https://node.sidrachain.com";

/* ================= UTILS : BLOCKCHAIN FETCHERS ================= */

/**
 * Récupère le solde USDT (TRC20) en direct
 */
async function getLiveUsdtBalance(address: string) {
  if (!address || address.trim() === "") return 0;
  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    const balance = await contract.balanceOf(address).call();
    
    // TronWeb v6 peut renvoyer un BigInt ou un objet avec _hex
    const rawBalance = typeof balance === 'object' && balance._hex ? balance._hex : balance;
    return Number(rawBalance) / 1_000_000;
  } catch (e: any) {
    console.error("❌ Erreur Live USDT (TronGrid):", e?.message || e);
    return null;
  }
}

/**
 * Récupère le solde Sidra (SDA) en direct
 */
async function getLiveSidraBalance(address: string) {
  if (!address || address.trim() === "") return 0;
  try {
    const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (e: any) {
    console.error("❌ Erreur Live Sidra (RPC Offline):", e?.message || e);
    return null;
  }
}

/* ================= GET : /api/user/wallet ================= */

export async function GET() {
  try {
    // 1. Récupération de l'utilisateur et de ses relations
    // Note: Dans une version sécurisée, on filtrerait par l'ID de session ici
    const user = await prisma.user.findFirst({
      include: {
        wallets: true,
        virtualCards: true,
        transactionsFrom: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 2. Récupération des soldes en direct (parallélisée pour la vitesse)
    const [liveUsdt, liveSda] = await Promise.all([
      getLiveUsdtBalance(user.usdtAddress || ""),
      getLiveSidraBalance(user.sidraAddress || "")
    ]);

    // 3. MISE À JOUR / CRÉATION AUTOMATIQUE (Synchronisation DB)
    const syncTasks = [];

    if (liveUsdt !== null) {
      syncTasks.push(
        prisma.wallet.upsert({
          where: { userId_currency: { userId: user.id, currency: "USDT" } },
          update: { balance: liveUsdt },
          create: { userId: user.id, currency: "USDT", type: "CRYPTO", balance: liveUsdt }
        })
      );
    }

    if (liveSda !== null) {
      syncTasks.push(
        prisma.wallet.upsert({
          where: { userId_currency: { userId: user.id, currency: "SDA" } },
          update: { balance: liveSda },
          create: { userId: user.id, currency: "SDA", type: "SIDRA", balance: liveSda }
        })
      );
    }

    if (syncTasks.length > 0) {
      // Utilisation de allSettled pour ne pas bloquer si un nœud RPC est lent
      await Promise.allSettled(syncTasks);
    }

    // 4. Récupération des données finales après synchronisation
    const updatedWallets = await prisma.wallet.findMany({
      where: { userId: user.id }
    });

    // 5. Formatage de la réponse pour le composant WalletPage
    const balances = updatedWallets.reduce((acc: any, wallet) => {
      acc[wallet.currency] = {
        balance: wallet.balance,
        type: wallet.type,
        updatedAt: wallet.updatedAt
      };
      return acc;
    }, {});

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Utilisateur PimPay",
        kycStatus: user.kycStatus,
        avatar: user.avatar,
        addresses: {
          usdt: user.usdtAddress,
          sidra: user.sidraAddress
        }
      },
      balances,
      virtualCard: user.virtualCards[0] || null,
      recentTransactions: user.transactionsFrom
    });

  } catch (error: any) {
    console.error("❌ [API_WALLET_CRITICAL_ERROR]:", error.message);
    return NextResponse.json({ 
      error: "Erreur technique lors de la récupération du portefeuille",
      details: error.message 
    }, { status: 500 });
  }
}
