export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { nanoid } from "nanoid";
import { convert } from "@/lib/exchange";
import { getFeeConfig } from "@/lib/fees";
import {
  createPayment,
  unwrap,
  resolveMomoMethod,
  normalizePhone,
  type GeniusPayPayment,
} from "@/lib/geniuspay";
import { getGeniusPayCurrency } from "@/lib/geniuspay-catalog";

/**
 * POST /api/transaction/card/fund/geniuspay
 *
 * Recharge une carte virtuelle PimPay via GeniusPay (Mobile Money ou carte).
 * Le client paie en XOF ; la carte est créditée en USD une fois le paiement
 * confirmé par le webhook /api/transaction/webhook (event payment.success).
 *
 * Body attendu :
 *   { cardId: string, amountUsd: number, phone?: string, operatorId?: string,
 *     operatorName?: string, method?: "card" | "momo", customerName?: string,
 *     customerEmail?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId)
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const body = await req.json();
    const {
      cardId,
      amountUsd,
      phone,
      operatorId,
      operatorName,
      method,
      customerName,
      customerEmail,
    } = body;

    const usd = parseFloat(amountUsd);
    if (!usd || usd <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!cardId) {
      return NextResponse.json({ error: "Carte requise" }, { status: 400 });
    }

    // Pays sélectionné + devise locale résolue dynamiquement (jamais codée en dur).
    const countryCode = (body.countryCode || "CI").toUpperCase();
    const currency = getGeniusPayCurrency(countryCode) || "XOF";

    // 1. Vérifier que la carte appartient bien à l'utilisateur (scope userId)
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) {
      return NextResponse.json(
        { error: "Carte virtuelle introuvable" },
        { status: 404 }
      );
    }
    if (card.isFrozen) {
      return NextResponse.json(
        { error: "Cette carte est gelée et ne peut pas être rechargée." },
        { status: 400 }
      );
    }

    // 2. Moyen de paiement
    const momoMethod =
      method === "card"
        ? undefined
        : resolveMomoMethod(`${operatorId || ""} ${operatorName || ""}`);
    if (momoMethod && !phone) {
      return NextResponse.json(
        { error: "Numéro de téléphone requis pour Mobile Money" },
        { status: 400 }
      );
    }

    // 3. Conversion USD -> devise locale + frais
    const localAmount = Math.round(convert("USD", currency, usd));
    if (localAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }
    const feeConfig = await getFeeConfig();
    const feeRate = momoMethod
      ? feeConfig.depositMobileFee
      : feeConfig.depositCardFee;
    const feeUsd = usd * feeRate;
    const netUsd = usd - feeUsd; // montant réellement crédité sur la carte (USD)

    // 4. Anti-doublon (30s)
    const existingTx = await prisma.transaction.findFirst({
      where: {
        fromUserId: userId,
        type: "CARD_RECHARGE",
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
    });
    if (existingTx) {
      return NextResponse.json(
        { error: "Une recharge est déjà en cours, veuillez patienter." },
        { status: 409 }
      );
    }

    // 5. Transaction PENDING
    const reference = `CRD-${nanoid(10).toUpperCase()}`;
    const normalizedPhone = phone ? normalizePhone(phone) : undefined;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: localAmount,
        fee: feeUsd,
        netAmount: netUsd,
        currency,
        destCurrency: "USD",
        type: "CARD_RECHARGE",
        status: "PENDING",
        description: `Recharge carte virtuelle via GeniusPay${
          momoMethod ? ` (${operatorName || momoMethod})` : " (Carte)"
        }`,
        operatorId: operatorId || null,
        accountNumber: normalizedPhone || null,
        countryCode,
        fromUserId: userId,
        metadata: {
          aggregator: "GENIUSPAY",
          kind: "card_fund",
          cardId,
          paymentMethod: momoMethod || "card",
          phoneNumber: normalizedPhone || null,
          localAmount,
          localCurrency: currency,
          usdAmount: usd,
          feeUsd,
          netUsd,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    // 6. Créer le paiement GeniusPay
    const gp = await createPayment({
      amount: localAmount,
      currency,
      paymentMethod: momoMethod,
      description: `PimobiPay recharge carte ${reference}`,
      customer: {
        name: customerName || card.holder,
        email: customerEmail,
        phone: normalizedPhone,
        country: countryCode,
      },
      metadata: { reference, userId, kind: "card_fund", cardId },
    });

    const payment = unwrap<GeniusPayPayment>(gp.data);
    const gpStatus = (payment?.status || "").toLowerCase();
    const accepted =
      gp.ok &&
      !!payment?.reference &&
      ["pending", "processing", "initiated"].includes(gpStatus);

    if (!accepted) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          statusClass: "AGGREGATOR_REJECTED",
          metadata: {
            ...(transaction.metadata as any),
            geniusPayResponse: gp.data,
          },
        },
      });
      const reason =
        (gp.data as any)?.message ||
        (gp.data as any)?.error ||
        "La recharge a été refusée par l'agrégateur GeniusPay.";
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        externalId: payment.reference,
        metadata: {
          ...(transaction.metadata as any),
          geniusPayReference: payment.reference,
          checkoutUrl: payment.checkout_url || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      geniusPayReference: payment.reference,
      status: "PENDING",
      xofAmount,
      currency: "XOF",
      paymentMethod: momoMethod || "card",
      checkoutUrl: payment.checkout_url || null,
    });
  } catch (error: any) {
    console.error("[v0] GENIUSPAY_CARD_FUND_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la recharge de la carte" },
      { status: 500 }
    );
  }
}
