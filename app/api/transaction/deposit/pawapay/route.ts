export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { nanoid } from "nanoid";
import { convert } from "@/lib/exchange";
import { getPiPrice } from "@/lib/fees";
import { createPayment, normalizePhone } from "@/lib/geniuspay";
import { resolveProvider } from "@/lib/pawapay-catalog";

/**
 * POST /api/transaction/deposit/pawapay
 *
 * Initie un dépôt Mobile Money via GeniusPay, qui encapsule le rail PawaPay.
 * Cette route historique est conservée pour compatibilité avec le frontend,
 * mais elle ne contacte jamais directement l'API PawaPay.
 *
 * Le client est redirigé vers la Payment Page hébergée par PawaPay
 * (POST /v2/paymentpage -> `redirectUrl`) pour choisir son opérateur et
 * confirmer le paiement — un parcours "checkout" équivalent à celui de
 * GeniusPay (`checkoutUrl`). Le frontend (app/deposit/page.tsx) gère déjà
 * cette redirection de façon générique via `result.checkoutUrl`, qu'il
 * s'agisse de GeniusPay ou de PawaPay.
 *
 * Le crédit effectif du wallet est réalisé :
 *   - normalement à la réception du webhook /api/webhooks/pawapay/deposit
 *     (statut COMPLETED) ;
 *   - en filet de sécurité, via /api/transaction/deposit/pawapay/confirm
 *     (réconciliation active) quand le client revient sur /deposit/summary.
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
    const depositId = reference;
    const normalizedPhone = normalizePhone(phone);

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
          aggregator: "GENIUSPAY",
          paymentMethod: "pawapay",
          pawapayProvider: resolved.provider,
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

    // 6. GeniusPay orchestre le rail PawaPay. L'application ne contacte
    //    jamais directement l'API PawaPay et n'a donc besoin d'aucun
    //    PAWAPAY_API_TOKEN.
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pimpay.vercel.app").replace(/\/$/, "");
    const gp = await createPayment({
      amount: localAmount,
      currency: resolved.currency,
      paymentMethod: "pawapay",
      mmoProvider: resolved.provider,
      description: `PimobiPay depot ${reference}`,
      customer: { phone: normalizedPhone, country: countryCode.toUpperCase() },
      successUrl: `${appBaseUrl}/deposit/summary?ref=${reference}&method=mobile&amount=${usd}`,
      errorUrl: `${appBaseUrl}/deposit/failed?ref=${reference}`,
      metadata: { reference, userId, kind: "deposit" },
    });

    // 7. Gérer la réponse de GeniusPay
    const payment = (gp.data as any)?.data || gp.data;
    const redirectUrl = payment?.payment_url || payment?.checkout_url || null;
    const geniusPayReference = payment?.reference || null;
    const accepted = gp.ok && !!geniusPayReference && !!redirectUrl;

    if (!accepted) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          statusClass: "AGGREGATOR_REJECTED",
          metadata: {
            ...(transaction.metadata as any),
            geniuspayResponse: gp.data,
          },
        },
      });
      const reason =
        (payment as any)?.errorMessage ||
        (payment as any)?.message ||
        (gp.data as any)?.errorMessage ||
        (gp.data as any)?.message ||
        "Le dépôt a été refusé par l'agrégateur Mobile Money.";
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    // 8. Persister l'URL de checkout (traçabilité / debug)
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        externalId: geniusPayReference || transaction.externalId,
        metadata: {
          ...(transaction.metadata as any),
          geniusPayReference,
          checkoutUrl: redirectUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      depositId,
      status: "PENDING",
      localAmount,
      localCurrency: resolved.currency,
      provider: resolved.provider,
      // Le frontend (app/deposit/page.tsx) redirige automatiquement vers
      // cette URL dès qu'elle est présente dans la réponse — même logique
      // que pour le checkout GeniusPay.
      checkoutUrl: redirectUrl,
    });
  } catch (error: any) {
    console.error("[v0] PAWAPAY_DEPOSIT_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initiation du dépôt" },
      { status: 500 }
    );
  }
}
