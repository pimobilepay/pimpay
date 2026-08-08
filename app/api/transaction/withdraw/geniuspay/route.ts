export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { calculateExchangeWithFee } from "@/lib/exchange";
import { TransactionStatus } from "@prisma/client";
import { getFeeConfig, getPiPrice } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import {
  enforcePiPolicy,
  assertDailyWithdrawalCount,
  resolveUserLimits,
  WithdrawalPolicyError,
} from "@/lib/withdrawal-limits";
import {
  createPayout,
  unwrapPayout,
  normalizePhone,
  GENIUSPAY_MIN_AMOUNT,
  extractGeniusPayMessage,
  isGeniusPayUnavailable,
  isGeniusPaySandboxQuotaError,
  GENIUSPAY_SANDBOX_QUOTA_MESSAGE,
} from "@/lib/geniuspay";
import { getGeniusPayCurrency } from "@/lib/geniuspay-catalog";
import { requestPayout, newPawaPayId } from "@/lib/pawapay";
import { resolveProvider } from "@/lib/pawapay-catalog";
import { convert } from "@/lib/exchange";
import { logSystemEvent } from "@/lib/systemLogger";

/**
 * POST /api/transaction/withdraw/geniuspay
 *
 * Retrait (cashout) Mobile Money via GeniusPay : débite le wallet PI de
 * l'utilisateur puis déclenche un payout dans la devise locale (XOF pour la zone
 * couverte par GeniusPay) vers le numéro du bénéficiaire.
 *
 * Ce endpoint accepte EXACTEMENT le même corps que /api/transaction/withdraw
 * (route PawaPay), afin que la page de confirmation puisse simplement choisir
 * l'URL en fonction de l'agrégateur résolu (GeniusPay primaire, PawaPay secours).
 *
 * Body : { amount | piAmount, method, currency, details:{ phone, provider,
 *          accountName? }, countryCode, fiatAmount, fiatCurrency }
 *
 * Sécurité : le débit Pi est fait AVANT l'appel payout (anti-double-dépense) ;
 * si GeniusPay refuse, on rembourse immédiatement. La finalisation (SUCCESS /
 * FAILED) est confirmée par le webhook /api/transaction/webhook (events cashout.*).
 */
/**
 * Repli automatique vers PawaPay quand GeniusPay est INDISPONIBLE (quota
 * sandbox epuise, endpoint payout absent, blocage Imunify360, 5xx).
 *
 * Sans ce repli, tout retrait echouait avec « Sandbox access denied: No tokens
 * remaining (0) » : le wallet etait debite puis rembourse et l'utilisateur ne
 * pouvait jamais retirer. On rejoue donc le payout chez l'agregateur de secours
 * avec le MEME solde deja debite ; le webhook /api/webhooks/pawapay/payout
 * finalise la transaction (il retrouve la transaction via `externalId`).
 */
async function retryPayoutWithPawaPay(params: {
  countryCode: string;
  operatorHint: string;
  phone: string;
  localAmount: number;
  localCurrency: string;
  transactionId: string;
  reference: string;
  userId: string;
  metadata: any;
}): Promise<{ ok: boolean; reason?: string; provider?: string }> {
  const resolved = resolveProvider(params.countryCode, params.operatorHint);
  if (!resolved.supported || !resolved.provider) {
    return {
      ok: false,
      reason:
        "L'agregateur de secours ne couvre pas cet operateur pour ce pays.",
    };
  }

  // La devise PawaPay du pays peut differer de celle utilisee par GeniusPay.
  const amount =
    resolved.currency === params.localCurrency
      ? params.localAmount
      : Math.round(
          convert(params.localCurrency, resolved.currency, params.localAmount)
        );
  if (!amount || amount <= 0) {
    return { ok: false, reason: "Montant converti invalide pour le secours." };
  }

  const payoutId = newPawaPayId();
  const pp = await requestPayout({
    payoutId,
    amount: String(amount),
    currency: resolved.currency,
    phoneNumber: params.phone,
    provider: resolved.provider,
    metadata: { reference: params.reference, userId: params.userId },
  });

  const status = String((pp.data as any)?.status || "").toUpperCase();
  const accepted =
    pp.ok && ["ACCEPTED", "SUBMITTED", "ENQUEUED", "PENDING"].includes(status);

  if (!accepted) {
    return {
      ok: false,
      reason:
        (pp.data as any)?.rejectionReason?.rejectionMessage ||
        (pp.data as any)?.failureReason?.failureMessage ||
        (pp.data as any)?.message ||
        "L'agregateur de secours a refuse le retrait.",
    };
  }

  await prisma.transaction.update({
    where: { id: params.transactionId },
    data: {
      externalId: payoutId,
      statusClass: "AGGREGATOR_PENDING",
      metadata: {
        ...(params.metadata || {}),
        aggregator: "PAWAPAY",
        aggregatorFallbackFrom: "GENIUSPAY",
        pawapayPayoutId: payoutId,
        provider: resolved.provider,
        localAmount: amount,
        localCurrency: resolved.currency,
      },
    },
  });

  return { ok: true, provider: resolved.provider };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload)
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    const userId = payload.id;

    const body = await req.json();
    const { details } = body;

    const piAmount = parseFloat(body.piAmount ?? body.amount);
    if (!piAmount || piAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const recipientPhone = normalizePhone(details?.phone || "");
    if (!recipientPhone) {
      return NextResponse.json(
        { error: "Numéro de téléphone du bénéficiaire manquant" },
        { status: 400 }
      );
    }
    const recipientName = details?.accountName || null;

    // Pays + devise locale résolus dynamiquement (jamais codés en dur).
    const countryCode = (body.countryCode || "CI").toUpperCase();
    const currency =
      body.fiatCurrency || getGeniusPayCurrency(countryCode) || "XOF";

    // Devise SOURCE du retrait : le wallet réellement sélectionné par
    // l'utilisateur (peut être "PI" ou un wallet fiat déjà crédité par un
    // dépôt Mobile Money / carte). [FIX] Avant ce correctif, le solde était
    // TOUJOURS vérifié/débité sur le wallet "PI", même quand l'utilisateur
    // avait sélectionné un wallet fiat → message erroné "Solde Pi insuffisant".
    const sourceCurrency = String(body.currency || "PI").toUpperCase();
    const isPiSource = sourceCurrency === "PI";

    // Montant net versé au bénéficiaire (devise locale).
    // On privilégie le montant déjà calculé/affiché côté client (fiatAmount) ;
    // à défaut, on recalcule Pi -> devise locale avec les frais retrait mobile.
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const conversion = calculateExchangeWithFee(
      piAmount,
      currency,
      feeConfig.withdrawMobileFee,
      piPrice
    );
    // Wallet fiat retiré dans sa propre devise : pas de conversion, seuls les
    // frais de la plateforme s'appliquent directement au montant saisi.
    const directFee = piAmount * feeConfig.withdrawMobileFee;
    const directNet = piAmount - directFee;
    const localAmount = Math.round(
      parseFloat(body.fiatAmount) > 0
        ? parseFloat(body.fiatAmount)
        : isPiSource
        ? conversion.total
        : directNet
    );
    if (localAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }
    // Contrôle AVANT tout débit : GeniusPay refuse les montants < 200 (min API).
    // Sans ce garde-fou, le wallet était débité puis remboursé, et l'utilisateur
    // ne voyait qu'une transaction FAILED sans explication.
    if (localAmount < GENIUSPAY_MIN_AMOUNT) {
      return NextResponse.json(
        {
          error: `Montant trop faible : le minimum accepté est ${GENIUSPAY_MIN_AMOUNT} ${currency} (soit ${localAmount} ${currency} demandés).`,
        },
        { status: 400 }
      );
    }

    // 1. Débit atomique du wallet PI + création de la transaction PENDING
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallets: { where: { currency: sourceCurrency } } },
        });
        const userWallet = user?.wallets[0];
        if (!userWallet || userWallet.balance < piAmount) {
          throw new Error(
            isPiSource
              ? "Solde Pi insuffisant pour cette opération"
              : `Solde ${sourceCurrency} insuffisant pour cette opération`
          );
        }

        // Politique de retrait administree (/admin/limits) : plafonds resolus
        // dynamiquement, exceptions possibles par role ou par utilisateur.
        // [FIX] Les plafonds sont dénommés en Pi et n'ont de sens que pour un
        // retrait qui débite réellement le wallet PI. Un wallet FIAT (XOF...)
        // déjà crédité par un dépôt Mobile Money est retiré DANS SA PROPRE
        // devise, sans conversion : le convertir artificiellement en
        // "équivalent Pi" pouvait déclencher un faux plafond ("100 Pi") pour
        // un simple retrait en XOF n'ayant jamais touché de Pi. Pour un
        // wallet fiat, on n'applique donc que la limite du nombre de retraits
        // par jour ; la conversion Pi reste réservée aux retraits crypto.
        let requiresAdminApproval = false;
        if (isPiSource) {
          const res = await enforcePiPolicy(tx, {
            userId,
            amountPi: piAmount,
            kycStatus: user?.kycStatus,
            role: user?.role,
            channel: "WITHDRAW",
          });
          requiresAdminApproval = res.requiresAdminApproval;
        } else {
          const fiatLimits = await resolveUserLimits({
            userId,
            role: user?.role,
            kycStatus: user?.kycStatus,
            channel: "WITHDRAW",
            db: tx,
          });
          await assertDailyWithdrawalCount(tx, userId, fiatLimits.maxPerDay);
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: userWallet.id },
          data: { balance: { decrement: piAmount } },
        });

        const feePi = isPiSource
          ? conversion.fee / (piPrice > 0 ? piPrice : 1)
          : directFee;

        const transaction = await tx.transaction.create({
          data: {
            reference: `WTH-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase(),
            amount: piAmount,
            type: "WITHDRAW",
            status: TransactionStatus.PENDING,
            statusClass: requiresAdminApproval
              ? "MANUAL_REVIEW"
              : "AGGREGATOR_PENDING",
            fromUserId: userId,
            fromWalletId: userWallet.id,
            description: `Retrait Mobile Money via GeniusPay${
              details?.provider ? ` (${details.provider})` : ""
            }`,
            currency: sourceCurrency,
            destCurrency: currency,
            countryCode,
            fee: feePi,
            accountNumber: recipientPhone,
            accountName: recipientName,
            metadata: {
              aggregator: "GENIUSPAY",
              method: "mobile",
              provider: details?.provider || null,
              phoneNumber: recipientPhone,
              recipientName,
              localAmount,
              localCurrency: currency,
              exchangeRate: isPiSource ? piPrice : 1,
              debitedPi: piAmount, // utilisé par le webhook pour rembourser si échec (dans `currency` ci-dessus)
              feePi,
              requiresAdminApproval,
              submittedAt: new Date().toISOString(),
            },
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: "Demande de retrait reçue",
            message: requiresAdminApproval
              ? `Votre retrait de ${piAmount} ${sourceCurrency} doit être validé par un administrateur.`
              : `Votre retrait de ${piAmount} ${sourceCurrency} est en cours de traitement.`,
            type: "INFO",
          },
        });

        return {
          transaction,
          newBalance: updatedWallet.balance,
          feePi,
          requiresAdminApproval,
          walletId: userWallet.id,
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );

    // Auto-conversion des frais en Pi (non bloquant)
    // Uniquement pertinent quand la source du retrait est le wallet PI : les
    // frais prélevés sur un wallet fiat sont déjà dans cette devise fiat.
    if (isPiSource && result.feePi > 0) {
      autoConvertFeeToPi(
        result.feePi,
        "PI",
        result.transaction.id,
        result.transaction.reference
      ).catch((err) =>
        console.error("[GENIUSPAY_WITHDRAW] Fee conversion:", err.message)
      );
    }

    // 2. Déclencher le payout GeniusPay (sauf validation admin requise)
    if (!result.requiresAdminApproval) {
      try {
        const gp = await createPayout({
          amount: localAmount,
          currency,
          recipient: { phone: recipientPhone, name: recipientName || undefined },
          // `destination` est OBLIGATOIRE côté API Payout (sinon 422).
          destination: {
            type: "mobile_money",
            provider: details?.provider || details?.operatorId || "",
            account: recipientPhone,
          },
          description: `PimobiPay retrait ${result.transaction.reference}`,
          // Idempotence basée sur notre référence : un retry réseau ne peut pas
          // déclencher deux payouts pour la même transaction.
          idempotencyKey: result.transaction.reference,
          metadata: { reference: result.transaction.reference, userId },
        });

        const rawGpResponse = gp.data as any;
        const payout = unwrapPayout(gp.data);
        const gpStatus = (payout?.status || "").toLowerCase();
        // En Sandbox, `data.status` peut être `null` alors que la racine de la
        // réponse confirme le succès (`success: true`, `scenario: "success"`).
        // Ne pas rejeter le payout dans ce cas.
        const rootIndicatesSuccess =
          rawGpResponse?.success === true ||
          rawGpResponse?.data?.scenario === "success";
        const accepted =
          gp.ok &&
          !!payout?.reference &&
          ([
            "pending",
            "processing",
            "requested",
            "approved",
            "created",
            "initiated",
            "queued",
            "accepted",
            "submitted",
            "completed",
            "success",
            "successful",
          ].includes(gpStatus) ||
            (!gpStatus && rootIndicatesSuccess));

        // ── GeniusPay INDISPONIBLE → repli automatique sur PawaPay ──────────
        // (quota sandbox épuisé « No tokens remaining », endpoint payout absent,
        //  blocage Imunify360, panne 5xx). Le solde reste débité : c'est le
        //  secours qui exécute le payout.
        if (!accepted && isGeniusPayUnavailable(gp)) {
          const gpReason = isGeniusPaySandboxQuotaError(gp.data)
            ? GENIUSPAY_SANDBOX_QUOTA_MESSAGE
            : extractGeniusPayMessage(gp.data) ||
              `GeniusPay indisponible (HTTP ${gp.status}).`;
          console.error("[v0] GENIUSPAY_PAYOUT_UNAVAILABLE:", gpReason);

          const fb = await retryPayoutWithPawaPay({
            countryCode,
            operatorHint: `${details?.operatorId || ""} ${
              details?.provider || ""
            }`,
            phone: recipientPhone,
            localAmount,
            localCurrency: currency,
            transactionId: result.transaction.id,
            reference: result.transaction.reference,
            userId,
            metadata: result.transaction.metadata as any,
          });

          await logSystemEvent({
            level: fb.ok ? "WARN" : "ERROR",
            source: "GENIUSPAY_WITHDRAW",
            action: fb.ok ? "FALLBACK_PAWAPAY" : "PAYOUT_UNAVAILABLE",
            message: fb.ok
              ? `GeniusPay indisponible : retrait basculé sur PawaPay (${fb.provider}). ${gpReason}`
              : `${gpReason} Secours PawaPay impossible : ${fb.reason}`,
            userId,
            requestId: result.transaction.reference,
            details: {
              httpStatus: gp.status,
              geniusPayResponse: gp.data,
              fallbackProvider: fb.provider || null,
              fallbackError: fb.reason || null,
            },
          }).catch(() => {});

          if (fb.ok) {
            return NextResponse.json({
              success: true,
              message:
                "Demande de retrait transmise avec succès (agrégateur de secours).",
              aggregator: "PAWAPAY",
              requiresAdminApproval: false,
              reference: result.transaction.reference,
              localAmount,
              currency,
              newBalance: result.newBalance,
            });
          }

          // Aucun secours possible : rembourser et expliquer précisément.
          await prisma
            .$transaction([
              prisma.wallet.update({
                where: { id: result.walletId },
                data: { balance: { increment: piAmount } },
              }),
              prisma.transaction.update({
                where: { id: result.transaction.id },
                data: {
                  status: TransactionStatus.FAILED,
                  statusClass: "AGGREGATOR_UNAVAILABLE",
                  metadata: {
                    ...(result.transaction.metadata as any),
                    geniusPayResponse: gp.data,
                    fallbackError: fb.reason,
                  },
                },
              }),
            ])
            .catch(() => {});

          return NextResponse.json(
            {
              error: `${gpReason} Votre solde a été recrédité. (${fb.reason})`,
            },
            { status: 503 }
          );
        }

        if (!accepted) {
          // Refus immédiat → rembourser les Pi débités
          await prisma.$transaction([
            prisma.wallet.update({
              where: { id: result.walletId },
              data: { balance: { increment: piAmount } },
            }),
            prisma.transaction.update({
              where: { id: result.transaction.id },
              data: {
                status: TransactionStatus.FAILED,
                statusClass: "AGGREGATOR_REJECTED",
                metadata: {
                  ...(result.transaction.metadata as any),
                  geniusPayResponse: gp.data,
                },
              },
            }),
          ]);
          // Message lisible : GeniusPay renvoie soit { error: { code, message } },
          // soit { message, errors: { champ: [...] } } (422 VALIDATION_ERROR).
          const errObj = (gp.data as any)?.error;
          const fieldErrors = (gp.data as any)?.errors;
          const reason =
            (typeof errObj === "object" ? errObj?.message : errObj) ||
            (gp.data as any)?.message ||
            (fieldErrors && typeof fieldErrors === "object"
              ? Object.entries(fieldErrors)
                  .map(
                    ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
                  )
                  .join(" | ")
              : null) ||
            "Le retrait a été refusé par l'agrégateur GeniusPay.";
          console.error(
            "[v0] GENIUSPAY_PAYOUT_REJECTED:",
            gp.status,
            JSON.stringify(gp.data)
          );
          return NextResponse.json({ error: reason }, { status: 400 });
        }

        // Persister la référence payout (externalId, suivi par le webhook cashout.*)
        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: {
            externalId: payout!.reference,
            metadata: {
              ...(result.transaction.metadata as any),
              geniusPayReference: payout!.reference,
              geniusPayPayoutId: payout!.id || null,
            },
          },
        });
      } catch (payoutErr: any) {
        await prisma
          .$transaction([
            prisma.wallet.update({
              where: { id: result.walletId },
              data: { balance: { increment: piAmount } },
            }),
            prisma.transaction.update({
              where: { id: result.transaction.id },
              data: {
                status: TransactionStatus.FAILED,
                statusClass: "AGGREGATOR_ERROR",
              },
            }),
          ])
          .catch(() => {});
        console.error("[v0] GENIUSPAY_PAYOUT_ERROR:", payoutErr.message);
        // Les erreurs de configuration (GENIUSPAY_WALLET_ID / clés absentes)
        // sont remontées telles quelles : sinon le diagnostic est impossible.
        const isConfigError = /GENIUSPAY_[A-Z_]+ non configuré/.test(
          payoutErr.message || ""
        );
        return NextResponse.json(
          {
            error: isConfigError
              ? payoutErr.message
              : "Erreur lors de l'envoi vers l'agrégateur GeniusPay. Votre solde a été recrédité.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: result.requiresAdminApproval
        ? "Demande de retrait transmise. En attente de validation administrateur."
        : "Demande de retrait transmise avec succès",
      requiresAdminApproval: result.requiresAdminApproval,
      reference: result.transaction.reference,
      localAmount,
      currency,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    if (error instanceof WithdrawalPolicyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("[v0] GENIUSPAY_WITHDRAW_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du traitement du retrait" },
      { status: 400 }
    );
  }
}
