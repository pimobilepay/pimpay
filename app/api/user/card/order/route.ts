export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserId } from "@/lib/auth";

const CARD_CONFIG: any = {
  // MASTERCARD
  PLATINIUM: { price: 10, daily: 1000, years: 3, prismaType: "CLASSIC", brand: "MASTERCARD" },
  PREMIUM: { price: 25, daily: 2500, years: 5, prismaType: "GOLD", brand: "MASTERCARD" },
  GOLD: { price: 50, daily: 5000, years: 10, prismaType: "GOLD", brand: "MASTERCARD" },
  ULTRA: { price: 100, daily: 999999, years: 15, prismaType: "ULTRA", brand: "MASTERCARD" },
  // VISA
  VISA_CLASSIC: { price: 15, daily: 1500, years: 3, prismaType: "CLASSIC", brand: "VISA" },
  VISA_GOLD: { price: 35, daily: 3000, years: 5, prismaType: "GOLD", brand: "VISA" },
  VISA_PLATINUM: { price: 75, daily: 10000, years: 10, prismaType: "BUSINESS", brand: "VISA" },
  VISA_INFINITE: { price: 150, daily: 999999, years: 15, prismaType: "ULTRA", brand: "VISA" },
};

// Allowed currencies per card (all support USD + EUR)
const ALLOWED_CURRENCIES = ["USD", "EUR"];

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
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
      // Visa cards start with 4, Mastercard starts with 5
      const cardPrefix = config.brand === "VISA" ? "4" : "5";
      const cardNum = cardPrefix + Math.floor(100000000000000 + Math.random() * 899999999999999).toString().slice(0, 15);
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
          brand: config.brand,
          dailyLimit: config.daily,
          isFrozen: false,
          allowedCurrencies: ALLOWED_CURRENCIES
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, card: result });

  } catch (error: any) {
    console.error("CARD_PURCHASE_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur lors de l'achat" }, { status: 400 });
  }
}
