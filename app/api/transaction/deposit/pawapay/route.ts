export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { nanoid } from "nanoid";
import { convert } from "@/lib/exchange";
import { getPiPrice } from "@/lib/fees";
import {
  requestDeposit,
  resolveProvider,
  normalizeMsisdn,
  newPawaPayId,
  getAppBaseUrl,
} from "@/lib/pawapay";

/**
 * POST /api/transaction/deposit/pawapay
 *
 * Initie un dépôt Mobile Money via l'agrégateur PawaPay (collecte / cash-in).
 * Le client reçoit une demande de paiement sur son téléphone (USSD / push).
 * Le crédit effectif du wallet est réalisé à la réception du webhook
 * /api/webhooks/pawapay/deposit (statut COMPLETED).
 *
 * Body attendu :
 *   { amountUsd: number, phone: string, operatorId?: string,
 *     operatorName?: string, countryCode: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId)
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const body = await req.json();
    const { amountUsd, phone, operatorId, operatorName, countryCode } = body;

    const usd = parseFloat(amountUsd);
    if (!usd || usd <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!phone || !countryCode) {
      return NextResponse.json(
        { error: "Téléphone et pays requis" },
        { status: 400 }
      );
    }

    // 1. Résoudre le provider PawaPay + la devise locale
    const resolved = resolveProvider(
      countryCode,
      `${operatorId || ""} ${operatorName || ""}`
    );
    if (!resolved.supported || !resolved.provider) {
      return NextResponse.json(
        {
          error:
            "Cet opérateur / pays n'est pas encore pris en charge par notre agrégateur Mobile Money.",
        },
        { status: 400 }
      );
    }

    // 2. Conversion USD -> devise locale (montant facturé au client via MoMo)
    const localAmountRaw = convert("USD", resolved.currency, usd);
    const localAmount = Math.round(localAmountRaw); // PawaPay attend un entier pour la plupart des devises
    if (localAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }

    // 3. Calcul des frais + montant net crédité (en Pi)
    // Frais de dépôt : 1% (aligné avec l'affichage de la page dépôt)
    const DEPOSIT_FEE_RATE = 0.01;
    const piPrice = await getPiPrice();
    const feeUsd = usd * DEPOSIT_FEE_RATE;
    const netUsd = usd - feeUsd;
    const netPi = piPrice > 0 ? netUsd / piPrice : 0;

    // 4. Anti-doublon (30s)
    const existingTx = await prisma.transaction.findFirst({
      where: {
        fromUserId: userId,
        type: "DEPOSIT",
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
    });
    if (existingTx) {
      return NextResponse.json(
        { error: "Un dépôt est déjà en cours, veuillez patienter." },
        { status: 409 }
      );
    }

    // 5. Créer la transaction PENDING
    const reference = `DEP-${nanoid(10).toUpperCase()}`;
    const depositId = newPawaPayId();
    const normalizedPhone = normalizeMsisdn(phone);

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        externalId: depositId,
        amount: localAmount,
        fee: feeUsd,
        netAmount: netUsd,
        currency: resolved.currency,
        destCurrency: "PI",
        type: "DEPOSIT",
        status: "PENDING",
        description: `Dépôt Mobile Money via ${operatorName || resolved.provider}`,
        operatorId: operatorId || null,
        accountNumber: normalizedPhone,
        countryCode: countryCode.toUpperCase(),
        fromUserId: userId,
        metadata: {
          aggregator: "PAWAPAY",
          pawapayDepositId: depositId,
          provider: resolved.provider,
          phoneNumber: normalizedPhone,
          localAmount,
          localCurrency: resolved.currency,
          usdAmount: usd,
          netUsd,
          netPi,
          piPrice,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    // 6. Appel PawaPay (collecte)
    const callbackUrl = `${getAppBaseUrl()}/api/webhooks/pawapay/deposit`;
    const pp = await requestDeposit({
      depositId,
      amount: String(localAmount),
      currency: resolved.currency,
      phoneNumber: normalizedPhone,
      provider: resolved.provider,
      callbackUrl,
      metadata: { reference, userId },
    });

    // 7. Gérer la réponse de l'agrégateur
    const ppStatus = (pp.data?.status || "").toUpperCase();
    const accepted =
      pp.ok && ["ACCEPTED", "SUBMITTED", "ENQUEUED", "PENDING"].includes(ppStatus);

    if (!accepted) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          statusClass: "AGGREGATOR_REJECTED",
          metadata: {
            ...(transaction.metadata as any),
            pawapayResponse: pp.data,
          },
        },
      });
      const reason =
        pp.data?.rejectionReason?.rejectionMessage ||
        pp.data?.failureReason?.failureMessage ||
        pp.data?.message ||
        "Le dépôt a été refusé par l'agrégateur Mobile Money.";
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reference,
      depositId,
      status: "PENDING",
      localAmount,
      localCurrency: resolved.currency,
      provider: resolved.provider,
    });
  } catch (error: any) {
    console.error("[v0] PAWAPAY_DEPOSIT_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initiation du dépôt" },
      { status: 500 }
    );
  }
}
