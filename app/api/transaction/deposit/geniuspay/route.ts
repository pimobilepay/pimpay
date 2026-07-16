export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { nanoid } from "nanoid";
import { convert } from "@/lib/exchange";
import { getPiPrice, getFeeConfig } from "@/lib/fees";
import {
  createPayment,
  unwrap,
  resolveMomoMethod,
  normalizePhone,
  type GeniusPayPayment,
  type GeniusPayMomoMethod,
} from "@/lib/geniuspay";
import { getGeniusPayCurrency } from "@/lib/geniuspay-catalog";
import { resolveProvider } from "@/lib/pawapay-catalog";
import { logSystemEvent } from "@/lib/systemLogger";

/**
 * POST /api/transaction/deposit/geniuspay
 *
 * Initie un dépôt via l'agrégateur GeniusPay (XOF / FCFA).
 *   - Si un opérateur Mobile Money est reconnu (Wave / Orange / MTN / Moov),
 *     GeniusPay déclenche un push de paiement sur le téléphone du client.
 *   - Sinon, l'API renvoie une `checkout_url` (page hébergée, carte bancaire)
 *     que le frontend ouvre pour finaliser le paiement.
 *
 * Le crédit effectif du wallet PI n'a lieu QU'À la réception du webhook
 * /api/transaction/webhook (event payment.success), jamais ici — anti-fraude.
 *
 * Body attendu :
 *   { amountUsd: number, phone?: string, operatorId?: string,
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

    // Pays sélectionné + devise locale résolue dynamiquement (jamais codée en dur).
    // GeniusPay couvre la zone XOF ; la devise est déduite du pays choisi.
    const countryCode = (body.countryCode || "CI").toUpperCase();
    const currency = getGeniusPayCurrency(countryCode) || "XOF";

    // 1. Déterminer le moyen de paiement GeniusPay.
    //    - method === "card"        -> checkout hébergé (aucun payment_method)
    //    - zone XOF native (UEMOA)  -> payment_method direct
    //                                  (wave / orange_money / mtn_money / moov_money)
    //    - autre zone Mobile Money  -> payment_method="pawapay" + mmo_provider
    //      (ex. Congo XAF => AIRTEL_COG / MTN_MOMO_COG).
    //
    //    IMPORTANT : hors zone XOF, les codes MoMo directs (airtel_money,
    //    mtn_money, ...) ne figurent PAS dans la règle `in:` de l'API GeniusPay
    //    et provoquaient l'erreur "validation.in". On passe donc par le
    //    fournisseur PawaPay explicite.
    const operatorHint = `${operatorId || ""} ${operatorName || ""}`;
    const XOF_NATIVE_ZONE = new Set([
      "CI", "SN", "BJ", "BF", "ML", "TG", "NE", "GW",
    ]);

    let paymentMethod: GeniusPayMomoMethod | "pawapay" | undefined;
    let mmoProvider: string | undefined;
    let isMobileMoney = false;

    if (method !== "card") {
      if (XOF_NATIVE_ZONE.has(countryCode)) {
        // Opérateur XOF direct (Wave, Orange, MTN, Moov).
        paymentMethod = resolveMomoMethod(operatorHint);
        isMobileMoney = !!paymentMethod;
      } else {
        // Hors zone XOF : GeniusPay route via PawaPay -> mmo_provider explicite.
        const pp = resolveProvider(countryCode, operatorHint);
        if (pp.supported && pp.provider) {
          paymentMethod = "pawapay";
          mmoProvider = pp.provider;
          isMobileMoney = true;
        }
        // Sinon : aucun opérateur reconnu -> repli checkout hébergé (carte).
      }
    }

    // Un paiement Mobile Money exige un numéro de téléphone.
    if (isMobileMoney && !phone) {
      return NextResponse.json(
        { error: "Numéro de téléphone requis pour Mobile Money" },
        { status: 400 }
      );
    }

    // 2. Conversion USD -> devise locale (montant facturé au client)
    const localAmount = Math.round(convert("USD", currency, usd));
    if (localAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }

    // 3. Frais + montant net crédité (en Pi)
    const feeConfig = await getFeeConfig();
    const feeRate = isMobileMoney
      ? feeConfig.depositMobileFee
      : feeConfig.depositCardFee;
    const piPrice = await getPiPrice();
    const feeUsd = usd * feeRate;
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
    const normalizedPhone = phone ? normalizePhone(phone) : undefined;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: localAmount,
        fee: feeUsd,
        netAmount: netUsd,
        currency,
        destCurrency: "PI",
        type: "DEPOSIT",
        status: "PENDING",
        description: `Dépôt via GeniusPay${
          isMobileMoney
            ? ` (${operatorName || mmoProvider || paymentMethod})`
            : " (Carte)"
        }`,
        operatorId: operatorId || null,
        accountNumber: normalizedPhone || null,
        countryCode,
        fromUserId: userId,
        metadata: {
          aggregator: "GENIUSPAY",
          paymentMethod: paymentMethod || "card",
          mmoProvider: mmoProvider || null,
          phoneNumber: normalizedPhone || null,
          localAmount,
          localCurrency: currency,
          usdAmount: usd,
          feeUsd,
          netUsd,
          netPi,
          piPrice,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    // 6. Appel GeniusPay (création du paiement)
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "https://pimpay.vercel.app"
    ).replace(/\/$/, "");
    console.log("[v0] GENIUSPAY_DEPOSIT_REQUEST:", {
      country: countryCode,
      currency,
      amount: localAmount,
      paymentMethod: paymentMethod || "(hosted checkout / card)",
      mmoProvider: mmoProvider || null,
    });
    const gp = await createPayment({
      amount: localAmount,
      currency,
      paymentMethod,
      mmoProvider,
      description: `PimobiPay depot ${reference}`,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: normalizedPhone,
        country: countryCode,
      },
      successUrl: `${appBaseUrl}/deposit?status=success&ref=${reference}`,
      errorUrl: `${appBaseUrl}/deposit?status=error&ref=${reference}`,
      metadata: { reference, userId, kind: "deposit" },
    });

    // 7. Gérer la réponse de l'agrégateur
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
      // GeniusPay renvoie l'erreur sous plusieurs formes :
      //   { success:false, error:{code,message} } | { message } |
      //   { message, errors: { champ: [...] } }                 (racine, Laravel)
      //   { error:{ message:"validation.in", errors:{ champ:[...] } } } (imbriqué)
      // On extrait un message lisible ET on nomme le(s) champ(s) fautif(s)
      // pour identifier précisément l'origine du refus (ex: "payment_method").
      const errObj = (gp.data as any)?.error;
      // Le détail des champs peut être à la racine OU sous `error.errors`.
      const errorsObj =
        (gp.data as any)?.errors ||
        (typeof errObj === "object" ? errObj?.errors : undefined);

      // Log détaillé : on déplie explicitement le champ fautif pour le diagnostic.
      console.error("[v0] GENIUSPAY_DEPOSIT_REJECTED:", {
        status: gp.status,
        message:
          (typeof errObj === "object" ? errObj?.message : errObj) ??
          (gp.data as any)?.message,
        fieldErrors: errorsObj ?? null,
        response: gp.data,
      });

      let fieldErrors = "";
      if (errorsObj && typeof errorsObj === "object") {
        fieldErrors = Object.entries(errorsObj)
          .map(
            ([field, msgs]) =>
              `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`
          )
          .join(" | ");
      }

      const baseReason =
        (typeof errObj === "object" ? errObj?.message : errObj) ||
        (gp.data as any)?.message ||
        payment?.["message" as keyof GeniusPayPayment] ||
        "Le paiement a été refusé par l'agrégateur GeniusPay.";
      const reason = fieldErrors
        ? `${baseReason} (${fieldErrors})`
        : baseReason;

      // Envoie l'erreur vers les logs Admin (onglet « Système »), source
      // GENIUSPAY_DEPOSIT. On y consigne le corps exact envoyé + le champ
      // rejeté par GeniusPay pour un diagnostic direct depuis le back-office.
      await logSystemEvent({
        level: "ERROR",
        source: "GENIUSPAY_DEPOSIT",
        action: "PAYMENT_REJECTED",
        message: reason,
        userId,
        requestId: reference,
        details: {
          httpStatus: gp.status,
          fieldErrors: errorsObj ?? null,
          sentRequest: {
            country: countryCode,
            currency,
            amount: localAmount,
            paymentMethod: paymentMethod || "(hosted checkout / card)",
            mmoProvider: mmoProvider || null,
          },
          geniusPayResponse: gp.data,
        },
      });

      return NextResponse.json({ error: reason }, { status: 400 });
    }

    // URL de paiement : `payment_url` (lien direct Wave/opérateur) OU
    // `checkout_url` (page de paiement hébergée GeniusPay) selon le mode.
    const paymentUrl = payment.payment_url || payment.checkout_url || null;

    // 8. Persister la référence GeniusPay (= externalId, utilisé par le webhook)
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        externalId: payment.reference,
        metadata: {
          ...(transaction.metadata as any),
          geniusPayReference: payment.reference,
          checkoutUrl: paymentUrl,
          netAmountXof: payment.net_amount ?? null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      geniusPayReference: payment.reference,
      status: "PENDING",
      localAmount,
      currency,
      paymentMethod: paymentMethod || "card",
      // Lien de paiement direct (Wave...) ou page de checkout hébergée.
      checkoutUrl: paymentUrl,
    });
  } catch (error: any) {
    console.error("[v0] GENIUSPAY_DEPOSIT_ERROR:", error.message);
    // Consigne aussi les exceptions inattendues dans les logs Admin (Système).
    await logSystemEvent({
      level: "ERROR",
      source: "GENIUSPAY_DEPOSIT",
      action: "EXCEPTION",
      message: error?.message || "Erreur lors de l'initiation du dépôt",
      details: {
        name: error?.name,
        stack: error?.stack?.substring(0, 2000),
      },
    });
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initiation du dépôt" },
      { status: 500 }
    );
  }
}
