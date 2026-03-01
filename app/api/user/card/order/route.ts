export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const CARD_CONFIG: any = {
  PLATINIUM: { price: 10, daily: 1000, years: 3, prismaType: "CLASSIC" },
  PREMIUM: { price: 25, daily: 2500, years: 5, prismaType: "GOLD" },
  GOLD: { price: 50, daily: 5000, years: 10, prismaType: "GOLD" },
  ULTRA: { price: 100, daily: 999999, years: 15, prismaType: "ULTRA" },
};

export async function POST(req: NextRequest) {
  try {
    // 1. SÉCURITÉ DU SECRET (Build-safe)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // 2. AUTHENTICATION (Harmonisé avec pimpay_token)
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
    }

    let userId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      userId = payload.id as string;
    } catch (authError) {
      return NextResponse.json({ error: "Authentification invalide" }, { status: 401 });
    }

    // 3. VALIDATION DU PALIER
    const body = await req.json().catch(() => ({}));
    const { tier } = body;
    const config = CARD_CONFIG[tier];
    if (!config) return NextResponse.json({ error: "Palier de carte invalide" }, { status: 400 });

    // 4. CALCUL DU PRIX EN PI (GCV)
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    const PI_RATE_GCV = systemConfig?.consensusPrice || 314159;
    const priceInPi = config.price / PI_RATE_GCV;

    // 5. DATE D'EXPIRATION
    const now = new Date();
    const expYear = (now.getFullYear() + config.years).toString().slice(-2);
    const expMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const expiryDate = `${expMonth}/${expYear}`;

    // 6. TRANSACTION ATOMIQUE PRISMA
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: "PI" } } }
      });

      const wallet = user?.wallets[0];

      if (!wallet || wallet.balance < priceInPi) {
        throw new Error(`Solde insuffisant: ${priceInPi.toFixed(8)} PI requis.`);
      }

      // Débit du portefeuille
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: priceInPi } }
      });

      if (updatedWallet.balance < 0) throw new Error("Erreur de synchronisation du solde.");

      // Création de l'historique (Status COMPLETED selon ton schéma)
      await tx.transaction.create({
        data: {
          reference: `CARD-BUY-${Date.now()}-${userId.slice(-4)}`.toUpperCase(),
          amount: priceInPi,
          currency: "PI",
          type: "CARD_PURCHASE",
          description: `Achat Carte Virtuelle ${tier}`,
          status: "SUCCESS",
          fromUserId: userId,
          fromWalletId: wallet.id,
        }
      });

      // Génération numéro de carte et titulaire
      const cardNum = "4492" + Math.floor(100000000000 + Math.random() * 899999999999).toString();
      const holderName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toUpperCase() || user?.username?.toUpperCase() || "PI PIONEER";

      // Création physique de la carte
      return await tx.virtualCard.create({
        data: {
          userId: userId,
          number: cardNum,
          cvv: Math.floor(Math.random() * 899 + 100).toString(),
          holder: holderName,
          exp: expiryDate,
          type: config.prismaType,
          brand: tier === "ULTRA" ? "MASTERCARD" : "VISA",
          dailyLimit: config.daily,
          isFrozen: false,
          allowedCurrencies: ["USD", "PI"]
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, card: result });

  } catch (error: any) {
    console.error("CARD_PURCHASE_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur lors de l'achat" }, { status: 400 });
  }
}
