export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Configuration des paliers en USD
const CARD_TIERS = {
  PLATINIUM: { usdPrice: 10, limit: 50000, currencies: ["PI", "USD", "EUR", "GBP"], prismaType: "CLASSIC" },
  PREMIUM: { usdPrice: 25, limit: 1000, currencies: ["PI"], prismaType: "GOLD" },
  GOLD: { usdPrice: 50, limit: 10000, currencies: ["PI", "USD"], prismaType: "GOLD" },
  ULTRA: { usdPrice: 100, limit: 999999, currencies: ["PI", "USD", "EUR"], prismaType: "ULTRA" }
};

export async function POST(req: NextRequest) {
  try {
    const userPayload = await verifyAuth(req);

    if (!userPayload || userPayload instanceof NextResponse) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { type, holderName, paymentCurrency } = body;

    const tier = CARD_TIERS[type as keyof typeof CARD_TIERS];
    if (!tier) return NextResponse.json({ error: "Type invalide" }, { status: 400 });

    const currency = paymentCurrency || "PI";

    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    const piPriceInUsd = systemConfig?.consensusPrice || 314159;
    const finalPrice = Number((currency === "PI" ? tier.usdPrice / piPriceInUsd : tier.usdPrice).toFixed(8));

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: userPayload.id, currency } }
      });

      if (!wallet || wallet.balance < finalPrice) {
        throw new Error(`Solde insuffisant: ${finalPrice} ${currency}`);
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: finalPrice } }
      });

      await tx.transaction.create({
        data: {
          reference: `CARD-BUY-${Date.now()}-${userPayload.id.slice(-4)}`.toUpperCase(),
          amount: finalPrice,
          currency,
          type: "PAYMENT",
          status: "SUCCESS",
          description: `Achat Carte ${type}`,
          fromUserId: userPayload.id,
          fromWalletId: wallet.id,
        }
      });

      const cardNumber = `4532${Math.floor(100000000000 + Math.random() * 899999999999)}`;
      
      // ✅ CORRECTION ICI : Utilisation de username au lieu de name
      const finalHolder = (holderName || userPayload.username || "PimPay User").toUpperCase().trim();

      return await tx.virtualCard.create({
        data: {
          userId: userPayload.id,
          type: tier.prismaType as any,
          number: cardNumber,
          exp: "12/28",
          cvv: Math.floor(100 + Math.random() * 899).toString(),
          holder: finalHolder,
          dailyLimit: tier.limit,
          allowedCurrencies: tier.currencies,
          brand: type === "ULTRA" ? "MASTERCARD" : "VISA",
          isFrozen: false
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, card: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
