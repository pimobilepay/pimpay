export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { TransactionStatus } from "@prisma/client";
import { getFeeConfig, getPiPrice } from "@/lib/fees";
import {
  requestPayout,
  resolveProvider,
  normalizeMsisdn,
  newPawaPayId,
  getAppBaseUrl,
} from "@/lib/pawapay";

/**
 * POST /api/transaction/transfer/mobile
 *
 * Transfert de Pi vers le compte Mobile Money d'un bénéficiaire externe, via
 * l'agrégateur PawaPay (payout). Le solde Pi de l'expéditeur est débité, puis
 * un payout est déclenché vers le numéro du bénéficiaire. Le statut final est
 * confirmé par le webhook /api/webhooks/pawapay/payout.
 *
 * Body : { piAmount, phone, operatorId?, operatorName?, countryCode,
 *          fiatAmount, fiatCurrency, note? }
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
    const {
      piAmount,
      phone,
      operatorId,
      operatorName,
      countryCode,
      fiatAmount,
      fiatCurrency,
      note,
    } = body;

    const pi = parseFloat(piAmount);
    if (!pi || pi <= 0)
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

    // 1. Résoudre le provider PawaPay
    const resolved = resolveProvider(
      countryCode || "",
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

    const normalizedPhone = normalizeMsisdn(phone || "");
    if (!normalizedPhone)
      return NextResponse.json(
        { error: "Numéro du bénéficiaire manquant" },
        { status: 400 }
      );

    const localCurrency = fiatCurrency || resolved.currency;
    const localAmount = Math.round(parseFloat(fiatAmount) || 0);
    if (localAmount <= 0)
      return NextResponse.json(
        { error: "Montant en devise locale invalide" },
        { status: 400 }
      );

    // 2. Frais de transfert (fraction, ex: 0.01 = 1%)
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const feePi = pi * (feeConfig.transferFee ?? 0.01);

    const payoutId = newPawaPayId();
    const reference = `TRF-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase();

    // 3. Débit atomique du wallet Pi + création de la transaction PENDING
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: "PI" } } },
      });
      const wallet = user?.wallets[0];
      if (!wallet || wallet.balance < pi) {
        throw new Error("Solde Pi insuffisant pour ce transfert");
      }

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: pi } },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference,
          externalId: payoutId,
          amount: pi,
          fee: feePi,
          type: "TRANSFER",
          status: TransactionStatus.PENDING,
          statusClass: "AGGREGATOR_PENDING",
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Transfert Mobile Money via ${operatorName || resolved.provider}`,
          note: note || null,
          currency: "PI",
          destCurrency: localCurrency,
          countryCode: (countryCode || "").toUpperCase(),
          accountNumber: normalizedPhone,
          metadata: {
            aggregator: "PAWAPAY",
            pawapayPayoutId: payoutId,
            provider: resolved.provider,
            phoneNumber: normalizedPhone,
            localAmount,
            localCurrency,
            exchangeRate: piPrice,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      return { transaction, newBalance: updated.balance, walletId: wallet.id };
    });

    // 4. Déclencher le payout PawaPay
    try {
      const callbackUrl = `${getAppBaseUrl()}/api/webhooks/pawapay/payout`;
      const pp = await requestPayout({
        payoutId,
        amount: String(localAmount),
        currency: localCurrency,
        phoneNumber: normalizedPhone,
        provider: resolved.provider,
        callbackUrl,
        metadata: { reference, userId },
      });

      const ppStatus = (pp.data?.status || "").toUpperCase();
      const accepted =
        pp.ok &&
        ["ACCEPTED", "SUBMITTED", "ENQUEUED", "PENDING"].includes(ppStatus);

      if (!accepted) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: result.walletId },
            data: { balance: { increment: pi } },
          }),
          prisma.transaction.update({
            where: { id: result.transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              statusClass: "AGGREGATOR_REJECTED",
            },
          }),
        ]);
        const reason =
          pp.data?.rejectionReason?.rejectionMessage ||
          pp.data?.failureReason?.failureMessage ||
          pp.data?.message ||
          "Le transfert Mobile Money a été refusé par l'agrégateur.";
        return NextResponse.json({ error: reason }, { status: 400 });
      }
    } catch (payoutErr: any) {
      await prisma
        .$transaction([
          prisma.wallet.update({
            where: { id: result.walletId },
            data: { balance: { increment: pi } },
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
      console.error("[v0] PAWAPAY_TRANSFER_ERROR:", payoutErr.message);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi vers l'agrégateur Mobile Money." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      reference,
      payoutId,
      status: "PENDING",
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("[v0] TRANSFER_MOBILE_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert Mobile Money" },
      { status: 400 }
    );
  }
}
