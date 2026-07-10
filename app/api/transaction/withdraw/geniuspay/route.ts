export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { calculateExchangeWithFee, convert } from "@/lib/exchange";
import { TransactionStatus } from "@prisma/client";
import { getFeeConfig, getPiPrice } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import {
  assertDailyWithdrawalCount,
  evaluatePiWithdrawal,
  WithdrawalPolicyError,
} from "@/lib/withdrawal-limits";
import { createPayout, unwrap, normalizePhone, type GeniusPayPayout } from "@/lib/geniuspay";

/**
 * POST /api/transaction/withdraw/geniuspay
 *
 * Retrait (cashout) Mobile Money via GeniusPay : débite le wallet PI de
 * l'utilisateur puis déclenche un payout XOF depuis le wallet marchand GeniusPay
 * vers le numéro du bénéficiaire.
 *
 * Sécurité : le débit Pi est fait AVANT l'appel payout (anti-double-dépense) ;
 * si GeniusPay refuse, on rembourse immédiatement. La finalisation (SUCCESS/FAILED)
 * est confirmée par le webhook /api/transaction/webhook (events cashout.*).
 *
 * Body attendu :
 *   { amount: number (Pi), phone: string, recipientName?: string,
 *     countryCode?: string }
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
    const { amount, phone, recipientName } = body;

    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const recipientPhone = normalizePhone(phone || "");
    if (!recipientPhone) {
      return NextResponse.json(
        { error: "Numéro de téléphone du bénéficiaire manquant" },
        { status: 400 }
      );
    }

    // 1. Conversion Pi -> XOF (montant net versé au bénéficiaire)
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const conversion = calculateExchangeWithFee(
      piAmount,
      "XOF",
      feeConfig.withdrawMobileFee,
      piPrice
    );
    const xofAmount = Math.round(conversion.total);
    if (xofAmount <= 0) {
      return NextResponse.json(
        { error: "Montant converti invalide" },
        { status: 400 }
      );
    }

    // 2. Débit atomique du wallet PI + création de la transaction PENDING
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
            description: `Retrait Mobile Money via GeniusPay`,
            currency: "PI",
            destCurrency: "XOF",
            countryCode: body.countryCode || "CI",
            fee: feePi,
            accountNumber: recipientPhone,
            accountName: recipientName || null,
            metadata: {
              aggregator: "GENIUSPAY",
              method: "mobile",
              phoneNumber: recipientPhone,
              recipientName: recipientName || null,
              localAmount: xofAmount,
              localCurrency: "XOF",
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

    // 3. Déclencher le payout GeniusPay (sauf validation admin requise)
    if (!result.requiresAdminApproval) {
      try {
        const gp = await createPayout({
          amount: xofAmount,
          currency: "XOF",
          recipient: { phone: recipientPhone, name: recipientName },
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
      xofAmount,
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
