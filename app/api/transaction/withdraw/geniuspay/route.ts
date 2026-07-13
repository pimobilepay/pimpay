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
  assertDailyWithdrawalCount,
  evaluatePiWithdrawal,
  WithdrawalPolicyError,
} from "@/lib/withdrawal-limits";
import {
  createPayout,
  unwrap,
  normalizePhone,
  type GeniusPayPayout,
} from "@/lib/geniuspay";
import { getGeniusPayCurrency } from "@/lib/geniuspay-catalog";

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
    const localAmount = Math.round(
      parseFloat(body.fiatAmount) > 0
        ? parseFloat(body.fiatAmount)
        : conversion.total
    );
    if (localAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }

    // 1. Débit atomique du wallet PI + création de la transaction PENDING
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallets: { where: { currency: "PI" } } },
        });
        const userWallet = user?.wallets[0];
        if (!userWallet || userWallet.balance < piAmount) {
          throw new Error("Solde Pi insuffisant pour cette opération");
        }

        // Politique de retrait (KYC + plafonds + limite journalière)
        await assertDailyWithdrawalCount(tx, userId);
        const { requiresAdminApproval } = evaluatePiWithdrawal({
          amountPi: piAmount,
          kycStatus: user?.kycStatus,
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: userWallet.id },
          data: { balance: { decrement: piAmount } },
        });

        const feePi = conversion.fee / (piPrice > 0 ? piPrice : 1);

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
            currency: "PI",
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
              exchangeRate: piPrice,
              debitedPi: piAmount, // utilisé par le webhook pour rembourser si échec
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
              ? `Votre retrait de ${piAmount} PI doit être validé par un administrateur.`
              : `Votre retrait de ${piAmount} PI est en cours de traitement.`,
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
    if (result.feePi > 0) {
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
          description: `PimobiPay retrait ${result.transaction.reference}`,
          metadata: { reference: result.transaction.reference, userId },
        });

        const payout = unwrap<GeniusPayPayout>(gp.data);
        const gpStatus = (payout?.status || "").toLowerCase();
        const accepted =
          gp.ok &&
          !!payout?.reference &&
          ["pending", "processing", "requested", "approved"].includes(gpStatus);

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
          const reason =
            (gp.data as any)?.message ||
            (gp.data as any)?.error ||
            "Le retrait a été refusé par l'agrégateur GeniusPay.";
          return NextResponse.json({ error: reason }, { status: 400 });
        }

        // Persister la référence payout (externalId, suivi par le webhook cashout.*)
        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: {
            externalId: payout.reference,
            metadata: {
              ...(result.transaction.metadata as any),
              geniusPayReference: payout.reference,
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
        return NextResponse.json(
          { error: "Erreur lors de l'envoi vers l'agrégateur GeniusPay." },
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
