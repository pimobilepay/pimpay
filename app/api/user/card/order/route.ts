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
    // --- CORRECTION AUTHENTIFICATION ---
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    // ----------------------------------

    const { tier } = await req.json();
    const config = CARD_CONFIG[tier];
    if (!config) return NextResponse.json({ error: "Palier invalide" }, { status: 400 });

    const PI_RATE_GCV = 314159; 
    const priceInPi = config.price / PI_RATE_GCV;

    const now = new Date();
    const expYear = (now.getFullYear() + config.years).toString().slice(-2);
    const expMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const expiryDate = `${expMonth}/${expYear}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: "PI" } } }
      });

      const wallet = user?.wallets[0];

      if (!wallet || wallet.balance < priceInPi) {
        throw new Error(`Solde insuffisant: ${priceInPi.toFixed(8)} π requis.`);
      }

      // Débit
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: priceInPi } }
      });

      // Historique
      await tx.transaction.create({
        data: {
          reference: `CARD-BUY-${Date.now()}`,
          amount: priceInPi,
          currency: "PI",
          description: `Achat Carte ${tier}`,
          status: "SUCCESS",
          fromUserId: userId,
          fromWalletId: wallet.id,
        }
      });

      // Création physique en base de données
      return await tx.virtualCard.create({
        data: {
          userId: userId,
          number: "4492" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0'),
          cvv: Math.floor(Math.random() * 899 + 100).toString(),
          holder: `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toUpperCase() || user?.username?.toUpperCase() || "PI PIONEER",
          exp: expiryDate,
          type: config.prismaType,
          brand: tier === "ULTRA" ? "MASTERCARD" : "VISA",
          dailyLimit: config.daily,
          isFrozen: false,
          allowedCurrencies: ["USD", "PI"]
        }
      });
    });

    return NextResponse.json({ success: true, card: result });
  } catch (error: any) {
    console.error("Erreur 401/400 Card:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
