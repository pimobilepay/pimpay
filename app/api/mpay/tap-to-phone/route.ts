export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

/**
 * VISA TAP TO PHONE — Encaissement sans contact
 * -------------------------------------------------
 * IMPORTANT : le vrai encaissement d'une carte Visa/Mastercard sans contact
 * (lecture EMV) ne peut PAS se faire depuis un navigateur web. En production,
 * la lecture de la carte doit passer par un SDK natif certifié PCI MPoC/CPoC
 * (ex : Stripe Tap to Pay, Adyen, etc.) via un acquéreur agréé Visa.
 *
 * Cette route reçoit le RÉSULTAT d'un tap (montant + données non sensibles de
 * la carte : réseau, 4 derniers chiffres) et crédite le portefeuille PimPay du
 * marchand connecté. Aucune donnée de carte complète (PAN, CVV) n'est acceptée
 * ni stockée — conformément aux règles PCI-DSS.
 */

const SUPPORTED_CURRENCIES = ["USD", "EUR", "XAF", "XOF"];
const CARD_SCHEMES = ["VISA", "MASTERCARD", "AMEX", "DISCOVER"];
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 5000;
const MERCHANT_FEE_RATE = 0.015; // 1.5% frais marchand PimPay

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION (le marchand qui encaisse)
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = user.id;

    // 2. LECTURE DU CORPS
    const body = await req.json().catch(() => ({}));
    const {
      amount,
      tip = 0,
      currency = "USD",
      cardScheme = "VISA",
      cardLast4,
      cardHolder,
    } = body ?? {};

    // 3. VALIDATIONS STRICTES
    const baseAmount = parseFloat(amount);
    const tipAmount = Math.max(0, Math.round((parseFloat(tip) || 0) * 100) / 100);
    const parsedAmount = Math.round((baseAmount + tipAmount) * 100) / 100;
    const cur = String(currency).toUpperCase();
    const scheme = String(cardScheme).toUpperCase();

    if (isNaN(baseAmount) || baseAmount < MIN_AMOUNT) {
      return NextResponse.json(
        { error: `Montant invalide (minimum ${MIN_AMOUNT})` },
        { status: 400 }
      );
    }
    if (parsedAmount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Montant supérieur à la limite (${MAX_AMOUNT} ${cur})` },
        { status: 400 }
      );
    }
    if (!SUPPORTED_CURRENCIES.includes(cur)) {
      return NextResponse.json(
        { error: `Devise non supportée : ${cur}` },
        { status: 400 }
      );
    }
    if (!CARD_SCHEMES.includes(scheme)) {
      return NextResponse.json(
        { error: "Réseau de carte non supporté" },
        { status: 400 }
      );
    }
    // Sécurité PCI : on n'accepte QUE les 4 derniers chiffres
    const last4 = String(cardLast4 ?? "").replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) {
      return NextResponse.json(
        { error: "Données de carte invalides" },
        { status: 400 }
      );
    }

    // 4. CALCUL DES MONTANTS
    const fee = Math.round(parsedAmount * MERCHANT_FEE_RATE * 100) / 100;
    const netAmount = Math.round((parsedAmount - fee) * 100) / 100;
    const reference = `TAP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. TRANSACTION ATOMIQUE — crédit du wallet marchand
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: cur } },
          update: { balance: { increment: netAmount } },
          create: {
            userId,
            currency: cur,
            balance: netAmount,
            type: "FIAT",
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            reference,
            amount: parsedAmount,
            fee,
            netAmount,
            type: "DEPOSIT",
            status: "SUCCESS",
            currency: cur,
            description: `Encaissement ${scheme} sans contact •••• ${last4}`,
            purpose: "TAP_TO_PHONE",
            toUserId: userId,
            toWalletId: wallet.id,
            accountName: cardHolder || `Carte ${scheme}`,
            metadata: {
              method: "VISA_TAP_TO_PHONE",
              cardScheme: scheme,
              cardLast4: last4,
              authCode,
              feeRate: MERCHANT_FEE_RATE,
              entryMode: "CONTACTLESS",
              baseAmount,
              tip: tipAmount,
            },
          },
        });

        return { wallet, transaction };
      },
      { maxWait: 10000, timeout: 30000 }
    );

    // 6. NOTIFICATION (non bloquante)
    try {
      await sendNotification({
        userId,
        title: "Paiement encaissé",
        message: `Vous avez reçu ${netAmount.toLocaleString("fr-FR")} ${cur} via ${scheme} sans contact.`,
        type: "success",
        metadata: {
          amount: netAmount,
          currency: cur,
          reference,
          method: "Visa Tap to Phone",
          status: "SUCCESS",
        },
      });
    } catch (notifErr) {
      console.warn("[TAP_TO_PHONE] Notification non envoyée:", notifErr);
    }

    // 7. REÇU
    return NextResponse.json({
      success: true,
      receipt: {
        reference,
        authCode,
        baseAmount,
        tip: tipAmount,
        amount: parsedAmount,
        fee,
        netAmount,
        currency: cur,
        cardScheme: scheme,
        cardLast4: last4,
        cardHolder: cardHolder || null,
        newBalance: result.wallet.balance,
        date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[TAP_TO_PHONE_ERROR]:", error);
    return NextResponse.json(
      { error: "Échec de l'encaissement", details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * GET — Historique des derniers encaissements Tap to Phone du marchand connecté.
 */
export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { toUserId: user.id, purpose: "TAP_TO_PHONE" },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const history = transactions.map((t) => {
      const meta = (t.metadata as Record<string, any> | null) ?? {};
      return {
        reference: t.reference,
        amount: t.amount,
        fee: t.fee,
        netAmount: t.netAmount,
        currency: t.currency,
        cardScheme: meta.cardScheme ?? "VISA",
        cardLast4: meta.cardLast4 ?? "----",
        tip: meta.tip ?? 0,
        cardHolder: t.accountName ?? null,
        date: t.createdAt,
      };
    });

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error("[TAP_TO_PHONE_HISTORY_ERROR]:", error);
    return NextResponse.json(
      { error: "Impossible de charger l'historique" },
      { status: 500 }
    );
  }
}
