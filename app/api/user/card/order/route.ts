import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/adminAuth';

const CARD_CONFIG: any = {
  PLATINIUM: { price: 10, daily: 1000, recharge: 10000, years: 3 },
  PREMIUM: { price: 25, daily: 2500, recharge: 25000, years: 5 },
  GOLD: { price: 50, daily: 5000, recharge: 50000, years: 10 },
  ULTRA: { price: 100, daily: 999999, recharge: 999999, years: 15 },
};

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { tier } = await req.json();
    const config = CARD_CONFIG[tier];
    if (!config) return NextResponse.json({ error: "Palier invalide" }, { status: 400 });

    const PI_RATE = 0.45; // 1 PI = 0.45$
    const priceInPi = parseFloat((config.price / PI_RATE).toFixed(4));

    // Calcul de la date d'expiration (MM/AA)
    const now = new Date();
    const expYear = (now.getFullYear() + config.years).toString().slice(-2);
    const expMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const expiryDate = `${expMonth}/${expYear}`;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: { userId: payload.id, currency: "PI" }
      });

      if (!wallet || wallet.balance < priceInPi) {
        throw new Error(`Solde insuffisant: ${priceInPi} π requis.`);
      }

      // Débit
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: priceInPi } }
      });

      // Création de la carte
      return await tx.virtualCard.create({
        data: {
          userId: payload.id,
          number: "4492" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0'),
          cvv: Math.floor(Math.random() * 899 + 100).toString(),
          holder: payload.username?.toUpperCase() || "PI PIONEER",
          exp: expiryDate,
          type: tier,
          brand: tier === "ULTRA" ? "MASTERCARD" : "VISA",
          dailyLimit: config.daily,
          locked: false
        }
      });
    });

    return NextResponse.json({ success: true, card: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
