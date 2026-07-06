/**
 * app/api/transfer/route.ts - UPDATED
 * [FIX V28 + V29] Rate limiting + transactional integrity
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { checkDistributedRateLimit, RATE_LIMITS } from "@/lib/distributedRateLimit";
import { transferSidraTokensAtomic } from "@/lib/blockchainTransaction";
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

    // [FIX V29] Atomic transfer with blockchain transaction
    const result = await transferSidraTokensAtomic(
      userId,
      toUserId,
      amount,
      currency
    );

    if (!result.success) {
      await logTransactionEvent(
        'TRANSFER',
        userId,
        amount,
        currency,
        toUserId,
        'FAILED'
      );

      return NextResponse.json(
        { error: result.error || "Transfert échoué" },
        { status: 400 }
      );
    }

    // Log successful transaction
    await logTransactionEvent(
      'TRANSFER',
      userId,
      amount,
      currency,
      toUserId,
      'SUCCESS'
    );

    return NextResponse.json({
      success: true,
      message: "Transfert réussi",
      txHash: result.txHash,
    });

  } catch (error: any) {
    console.error("TRANSFER_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
