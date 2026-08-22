/**
 * app/api/transfer/route.ts - UPDATED
 * [FIX V28 + V29] Rate limiting + transactional integrity
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuthUserId } from "@/lib/auth";
import { checkDistributedRateLimit, RATE_LIMITS } from "@/lib/distributedRateLimit";
import { getClientIp } from "@/lib/rate-limit";
import { logTransactionEvent } from "@/lib/secureLogger";
import { validateCsrfMiddleware } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // [FIX V25] CSRF validation
    if (!validateCsrfMiddleware(req)) {
      return NextResponse.json(
        { error: "CSRF token invalide" },
        { status: 403 }
      );
    }

    // [FIX V28] Distributed rate limiting
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = await checkDistributedRateLimit(
      `transfer:${userId}`,
      RATE_LIMITS.TRANSFER.limit,
      RATE_LIMITS.TRANSFER.window
    );

    if (rl.limited) {
      await logTransactionEvent(
        'TRANSFER_RATE_LIMITED',
        userId,
        0,
        'N/A',
        undefined,
        'FAILED'
      );

      return NextResponse.json(
        { error: "Trop de transferts. Veuillez patienter." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter),
            "X-RateLimit-Remaining": String(rl.remaining),
          },
        }
      );
    }

    const body = await req.json();
    const { toUserId, amount, currency = "SDA" } = body;

    // Validate inputs
    if (!toUserId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    // Check recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, status: true },
    });

    if (!recipient || recipient.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Destinataire introuvable ou inactif" },
        { status: 404 }
      );
    }

    const normalizedCurrency = String(currency).trim().toUpperCase();
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || normalizedAmount > 1_000_000_000) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (userId === toUserId) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous transférer des fonds" }, { status: 400 });
    }

    const reference = `TXN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
    try {
      await prisma.$transaction(async (tx) => {
        const sender = await tx.wallet.findUnique({
          where: { userId_currency: { userId, currency: normalizedCurrency } },
          select: { id: true, balance: true },
        });
        if (!sender || sender.balance < normalizedAmount) {
          throw new Error("Solde insuffisant");
        }

        await tx.wallet.update({
          where: { id: sender.id },
          data: { balance: { decrement: normalizedAmount } },
        });
        await tx.wallet.upsert({
          where: { userId_currency: { userId: toUserId, currency: normalizedCurrency } },
          update: { balance: { increment: normalizedAmount } },
          create: { userId: toUserId, currency: normalizedCurrency, balance: normalizedAmount, type: "CRYPTO" },
        });
        await tx.transaction.create({
          data: {
            reference,
            amount: normalizedAmount,
            fromUserId: userId,
            toUserId,
            currency: normalizedCurrency,
            type: "TRANSFER",
            status: "SUCCESS",
            description: `Transfert ${normalizedCurrency}`,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transfert échoué";
      await logTransactionEvent('TRANSFER', userId, normalizedAmount, normalizedCurrency, toUserId, 'FAILED');
      return NextResponse.json({ error: message }, { status: message === "Solde insuffisant" ? 400 : 500 });
    }

    await logTransactionEvent('TRANSFER', userId, normalizedAmount, normalizedCurrency, toUserId, 'SUCCESS');
    return NextResponse.json({ success: true, message: "Transfert réussi", txHash: reference });

  } catch (error: any) {
    console.error("TRANSFER_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
