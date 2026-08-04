export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { enforceTxRateLimit, getClientIp } from "@/lib/tx-rate-limit";
import { enforcePiPolicy, WithdrawalPolicyError } from "@/lib/withdrawal-limits";

function getWalletType(currency: string): WalletType {
  if (currency === "PI") return WalletType.PI;
  if (currency === "SDA") return WalletType.SIDRA;
  if (["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND", "MGA"].includes(currency))
    return WalletType.FIAT;
  return WalletType.CRYPTO;
}

// ─── Regler une demande de paiement depuis le wallet du payeur ──────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Auth
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const payerId = payload.id;

    // Rate limit (meme protection que les transferts).
    const ip = getClientIp(req);
    const limited = await enforceTxRateLimit({ userId: payerId, ip, action: "send" });
    if (limited) return limited;

    const { code } = await params;

    const feeConfig = await getFeeConfig();

    const result = await prisma.$transaction(async (tx) => {
      // Verrou logique : on relit la demande dans la transaction.
      const request = await tx.paymentRequest.findUnique({
        where: { code },
        include: {
          requester: { select: { id: true, username: true, name: true } },
        },
      });

      if (!request) throw new Error("NOT_FOUND");
      if (request.status === "PAID") throw new Error("ALREADY_PAID");
      if (request.status === "CANCELLED") throw new Error("CANCELLED");
      if (request.status === "EXPIRED" || request.expiresAt < new Date()) {
        // Normalise l'etat si l'expiration vient de passer.
        if (request.status === "PENDING") {
          await tx.paymentRequest.update({
            where: { id: request.id },
            data: { status: "EXPIRED" },
          });
        }
        throw new Error("EXPIRED");
      }
      if (request.requesterId === payerId) throw new Error("SELF_PAY");

      const { amount, currency } = request;
      const { feeAmount: fee, totalDebit } = calculateFee(amount, feeConfig, "transfer");

      // Payeur
      const payer = await tx.user.findUnique({
        where: { id: payerId },
        select: { name: true, username: true, role: true, kycStatus: true },
      });
      const payerName = payer?.name || payer?.username || "Un utilisateur PIMOBIPAY";

      // Plafonds administres (/admin/limits, canal MPAY) : la franchise KYC et
      // le plafond par transaction s'appliquent aussi au reglement d'une demande.
      if (currency === "PI") {
        await enforcePiPolicy(tx, {
          userId: payerId,
          amountPi: amount,
          kycStatus: payer?.kycStatus,
          role: payer?.role,
          channel: "MPAY",
          countDaily: false,
        });
      }

      const payerWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: payerId, currency } },
      });
      if (!payerWallet) throw new Error(`NO_WALLET:${currency}`);
      if (payerWallet.balance < totalDebit) throw new Error("INSUFFICIENT");

      // Debit payeur
      const updatedPayer = await tx.wallet.update({
        where: { id: payerWallet.id },
        data: { balance: { decrement: totalDebit } },
      });

      // Credit demandeur
      const toWallet = await tx.wallet.upsert({
        where: {
          userId_currency: { userId: request.requesterId, currency },
        },
        update: { balance: { increment: amount } },
        create: {
          userId: request.requesterId,
          currency,
          balance: amount,
          type: getWalletType(currency),
        },
      });

      const reference = `PIM-REQ-${nanoid(10).toUpperCase()}`;
      const transaction = await tx.transaction.create({
        data: {
          reference,
          amount,
          fee,
          netAmount: amount,
          currency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: payerId,
          toUserId: request.requesterId,
          fromWalletId: updatedPayer.id,
          toWalletId: toWallet.id,
          description:
            request.note ||
            `Demande de paiement reglee a @${request.requester.username}`,
          metadata: {
            paymentRequestCode: request.code,
            note: request.note || undefined,
          },
        },
      });

      // Marque la demande comme payee
      await tx.paymentRequest.update({
        where: { id: request.id },
        data: {
          status: "PAID",
          payerId,
          paidAt: new Date(),
          reference,
        },
      });

      // Notifie le demandeur qu'il a ete paye
      await tx.notification
        .create({
          data: {
            userId: request.requesterId,
            title: "Demande payee !",
            message: `${payerName} a regle votre demande de ${amount.toLocaleString()} ${currency}.`,
            type: "PAYMENT_RECEIVED",
            metadata: { amount, currency, payerName, reference },
          },
        })
        .catch(() => {});

      return {
        reference,
        amount,
        currency,
        newBalance: updatedPayer.balance,
        requesterUsername: request.requester.username,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    // Plafonds / KYC : on remonte le message exact de la politique au payeur.
    if (err instanceof WithdrawalPolicyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }

    const msg = String(err?.message || "");
    const map: Record<string, { status: number; error: string }> = {
      NOT_FOUND: { status: 404, error: "Demande introuvable." },
      ALREADY_PAID: { status: 409, error: "Cette demande a deja ete payee." },
      CANCELLED: { status: 409, error: "Cette demande a ete annulee." },
      EXPIRED: { status: 410, error: "Cette demande a expire." },
      SELF_PAY: { status: 400, error: "Vous ne pouvez pas payer votre propre demande." },
      INSUFFICIENT: { status: 400, error: "Solde insuffisant." },
    };
    if (map[msg]) {
      return NextResponse.json({ error: map[msg].error }, { status: map[msg].status });
    }
    if (msg.startsWith("NO_WALLET:")) {
      const cur = msg.split(":")[1];
      return NextResponse.json(
        { error: `Vous n'avez pas de portefeuille ${cur}.` },
        { status: 400 }
      );
    }
    console.log("[v0] payment request pay error:", msg);
    return NextResponse.json(
      { error: "Le paiement a echoue." },
      { status: 500 }
    );
  }
}
