export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { TransactionStatus } from "@prisma/client";
import { getFeeConfig, getPiPrice } from "@/lib/fees";
import {
  createPayout,
  unwrap,
  normalizePhone,
  type GeniusPayPayout,
} from "@/lib/geniuspay";
import { getGeniusPayCurrency } from "@/lib/geniuspay-catalog";

/**
 * POST /api/transaction/transfer/geniuspay
 *
 * Transfert de Pi vers le compte Mobile Money d'un bénéficiaire externe, via
 * l'agrégateur GeniusPay (payout). Le solde Pi de l'expéditeur est débité, puis
 * un payout est déclenché vers le numéro du bénéficiaire dans la devise locale
 * (XOF pour la zone couverte par GeniusPay).
 *
 * Ce endpoint accepte EXACTEMENT le même corps que /api/transaction/transfer/mobile
 * (route PawaPay), afin que la page transfert puisse simplement choisir l'URL en
 * fonction de l'agrégateur résolu (GeniusPay primaire, PawaPay secours).
 *
 * Body : { piAmount, phone, operatorId?, operatorName?, countryCode,
 *          fiatAmount, fiatCurrency, note? }
 *
 * Sécurité : le débit Pi est fait AVANT l'appel payout (anti-double-dépense) ;
 * si GeniusPay refuse, on rembourse immédiatement. La finalisation (SUCCESS /
 * FAILED) est confirmée par le webhook /api/transaction/webhook (events cashout.*),
 * qui rembourse `metadata.debitedPi` en cas d'échec.
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

    const recipientPhone = normalizePhone(phone || "");
    if (!recipientPhone)
      return NextResponse.json(
        { error: "Numéro du bénéficiaire manquant" },
        { status: 400 }
      );
    const recipientName = operatorName || null;

    // Pays + devise locale résolus dynamiquement (jamais codés en dur).
    const cc = (countryCode || "CI").toUpperCase();
    const localCurrency = fiatCurrency || getGeniusPayCurrency(cc) || "XOF";
    const localAmount = Math.round(parseFloat(fiatAmount) || 0);
    if (localAmount <= 0)
      return NextResponse.json(
        { error: "Montant en devise locale invalide" },
        { status: 400 }
      );

    // Frais de transfert (fraction, ex: 0.01 = 1%)
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const feePi = pi * (feeConfig.transferFee ?? 0.01);

    const reference = `TRF-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase();

    // 1. Débit atomique du wallet Pi + création de la transaction PENDING
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
          amount: pi,
          fee: feePi,
          type: "TRANSFER",
          status: TransactionStatus.PENDING,
          statusClass: "AGGREGATOR_PENDING",
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Transfert Mobile Money via GeniusPay${
            operatorName ? ` (${operatorName})` : ""
          }`,
          note: note || null,
          currency: "PI",
          destCurrency: localCurrency,
          countryCode: cc,
          accountNumber: recipientPhone,
          accountName: recipientName,
          metadata: {
            aggregator: "GENIUSPAY",
            method: "mobile",
            provider: operatorId || null,
            phoneNumber: recipientPhone,
            recipientName,
            localAmount,
            localCurrency,
            exchangeRate: piPrice,
            debitedPi: pi, // utilisé par le webhook pour rembourser si échec
            feePi,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      return { transaction, newBalance: updated.balance, walletId: wallet.id };
    });

    // 2. Déclencher le payout GeniusPay
    try {
      const gp = await createPayout({
        amount: localAmount,
        currency: localCurrency,
        recipient: {
          phone: recipientPhone,
          name: recipientName || undefined,
        },
        description: `PimobiPay transfert ${reference}`,
        metadata: { reference, userId },
      });

      const payout = unwrap<GeniusPayPayout>(gp.data);
      const gpStatus = (payout?.status || "").toLowerCase();
      const accepted =
        gp.ok &&
        !!payout?.reference &&
        ["pending", "processing", "requested", "approved"].includes(gpStatus);

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
          "Le transfert Mobile Money a été refusé par l'agrégateur GeniusPay.";
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
      console.error("[v0] GENIUSPAY_TRANSFER_ERROR:", payoutErr.message);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi vers l'agrégateur GeniusPay." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      reference,
      status: "PENDING",
      localAmount,
      currency: localCurrency,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("[v0] GENIUSPAY_TRANSFER_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert Mobile Money" },
      { status: 400 }
    );
  }
}
