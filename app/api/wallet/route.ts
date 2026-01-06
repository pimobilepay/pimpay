import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// --- CONFIGURATION ---
const SIDRA_RPC = "https://node.sidrachain.com";
const PI_API_URL = "https://api.minepi.com/v2";
const PI_SERVER_KEY = process.env.PI_SERVER_KEY; // À mettre dans ton fichier .env

/* ================= UTILS : BLOCKCHAIN & API ================= */

async function getSidraBalance(address: string) {
  try {
    const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (e) {
    return 0.00;
  }
}

async function getPiUserData(accessToken: string) {
  try {
    // Appel à l'API Pi selon la doc que tu as vérifiée
    const response = await fetch(`${PI_API_URL}/me`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}` 
      }
    });
    return await response.json();
  } catch (e) {
    return null;
  }
}

/* ================= MOCK DATA (DB SIMULATION) ================= */
let mockBalances: any = {
  USD: 1250.00,
  BTC: 0.0025,
  XAF: 75000,
  PI: 314.15 // Valeur par défaut si l'API est hors ligne
};

/* ================= GET : /api/user/wallet ================= */
export async function GET(req: NextRequest) {
  try {
    // 1. Récupération Sidra (Réel via RPC)
    const userSdaAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Exemple
    const sdaRealBalance = await getSidraBalance(userSdaAddress);

    // 2. Préparation de la réponse pour PimPay
    // Note: Dans une vraie app, tu récupères l'UID Pi depuis ta DB
    const data = {
      profile: {
        name: "Pioneer User",
        kycStatus: "VERIFIED", // Statut synchronisé
        pi_uid: "user-1234-abcd" 
      },
      virtualCard: {
        number: "4532 8821 9011 3456",
        exp: "12/28",
        cvv: "312"
      },
      balances: {
        USD: { balance: mockBalances.USD },
        PI: { balance: mockBalances.PI },
        SDA: { balance: sdaRealBalance },
        BTC: { balance: mockBalances.BTC },
        XAF: { balance: mockBalances.XAF }
      },
      history: [
        {
          id: "tx_01",
          label: "Transfert Pi Network",
          amount: 10.5,
          direction: "IN",
          currency: "PI",
          status: "COMPLETED",
          date: "5 Janv. 2026"
        },
        {
          id: "tx_02",
          label: "Paiement Carte Virtuelle",
          amount: 45.00,
          direction: "OUT",
          currency: "USD",
          status: "COMPLETED",
          date: "4 Janv. 2026"
        }
      ],
      chart: [
        { amount: 2000 }, { amount: 4500 }, { amount: 2800 }, { amount: 5000 }
      ]
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur Wallet API:", error);
    return NextResponse.json({ error: "Erreur lors de la synchronisation" }, { status: 500 });
  }
}

/* ================= POST : /api/user/wallet (Transactions) ================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, amount, currency } = body;

    // Exemple de validation de paiement Pi (Côté Serveur)
    if (currency === "PI" && action === "approve") {
      const paymentId = body.paymentId;
      const response = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Key ${PI_SERVER_KEY}` 
        }
      });
      const result = await response.json();
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "Action reçue" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur transaction" }, { status: 500 });
  }
}
