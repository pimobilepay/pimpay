export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Wallet as EthersWallet } from "ethers";
import crypto from "crypto";

// Fonction pour générer des paires (Clé Privée / Adresse)
const generateBlockchainIdentities = () => {
  // 1. Sidra Chain (EVM Compatible)
  const sidraWallet = EthersWallet.createRandom();

  // 2. USDT TRC20 (Format similaire à EVM pour la clé, mais adresse commence par T)
  // Note: Pour un vrai réseau Tron, on utiliserait tronweb, 
  // ici on simule le format pour PimPay
  const usdtPrivKey = crypto.randomBytes(32).toString('hex');
  const usdtAddr = `T${crypto.randomBytes(20).toString('hex').substring(0, 33)}`;

  // 3. Pi / BTC (Format simplifié pour PimPay)
  const piPrivKey = crypto.randomBytes(32).toString('hex');
  const piAddr = `P${crypto.randomBytes(20).toString('hex').toUpperCase()}`;

  return {
    sidra: { address: sidraWallet.address, privateKey: sidraWallet.privateKey },
    usdt: { address: usdtAddr, privateKey: usdtPrivKey },
    pi: { address: piAddr, privateKey: piPrivKey }
  };
};

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.id || payload.userId) as string;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true, virtualCards: true, _count: true }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // --- LOGIQUE DE GÉNÉRATION SÉCURISÉE ---
    // On vérifie si l'utilisateur manque d'adresses OU de clés privées
    if (!user.sidraAddress || !user.sidraPrivateKey || !user.usdtAddress) {
      const identities = generateBlockchainIdentities();

      user = await prisma.user.update({
        where: { id: userId },
        data: {
          // Sidra : On ne remplace que si c'est vide
          sidraAddress: user.sidraAddress || identities.sidra.address,
          sidraPrivateKey: user.sidraPrivateKey || identities.sidra.privateKey,

          // USDT : On ne remplace que si c'est vide
          usdtAddress: user.usdtAddress || identities.usdt.address,
          usdtPrivateKey: user.usdtPrivateKey || identities.usdt.privateKey,

          // Pi / BTC
          walletAddress: user.walletAddress || identities.pi.address,

          // Initialisation des Wallets (Soldes)
          wallets: {
            connectOrCreate: [
              { where: { userId_currency: { userId, currency: "PI" } }, create: { currency: "PI", balance: 0, type: "PI" } },
              { where: { userId_currency: { userId, currency: "SDA" } }, create: { currency: "SDA", balance: 0, type: "SIDRA" } },
              { where: { userId_currency: { userId, currency: "USDT" } }, create: { currency: "USDT", balance: 0, type: "CRYPTO" } }
            ]
          }
        },
        include: { wallets: true, virtualCards: true, _count: true }
      });
    }

    // Extraction du solde PI pour le Dashboard
    const piBalance = user.wallets.find(w => w.currency === "PI")?.balance ?? 0;

    return NextResponse.json({
      success: true,
      id: user.id,
      username: user.username,
      name: user.name || user.username,
      avatar: user.avatar,
      kycStatus: user.kycStatus,
      
      // Adresses (On ne renvoie JAMAIS les clés privées au frontend pour la sécurité)
      walletAddress: user.walletAddress,
      usdtAddress: user.usdtAddress,
      sidraAddress: user.sidraAddress,

      balance: piBalance,
      wallets: user.wallets,
      virtualCards: user.virtualCards,
    });

  } catch (error: any) {
    console.error("PROFILE_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
