export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";

/**
 * SECURITY FIX [CRITIQUE] — Route debug/transactions
 *
 * AVANT : La clé DEBUG_API_KEY était optionnelle → endpoint public si la variable
 *         n'était pas définie en production.
 *
 * APRÈS :
 *  - En production  → 404 systématique (le middleware bloque déjà, double sécurité ici).
 *  - En development → DEBUG_API_KEY OBLIGATOIRE. Si absente, le serveur refuse de démarrer
 *    correctement et retourne 503 pour éviter une fausse sécurité.
 *  - error.stack n'est JAMAIS inclus dans la réponse HTTP.
 */

function checkDebugAuth(req: NextRequest): NextResponse | null {
  // Bloquer en production (le middleware le fait déjà, mais on double)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const expectedKey = process.env.DEBUG_API_KEY;
  if (!expectedKey) {
    // Clé non configurée en dev → refuser plutôt qu'autoriser
    return NextResponse.json(
      { error: "DEBUG_API_KEY non configurée. Ajoutez-la dans .env.local." },
      { status: 503 }
    );
  }

  const apiKey = req.headers.get("x-debug-key");
  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Auth OK
}

export async function GET(req: NextRequest) {
  const authError = checkDebugAuth(req);
  if (authError) return authError;

  try {
    const pendingWithdraws = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        blockchainTx: null,
      },
      include: {
        fromUser: {
          select: { id: true, username: true, piUserId: true },
        },
        toUser: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        reference: true,
        currency: true,
        amount: true,
        status: true,
        blockchainTx: true,
        accountNumber: true,
        createdAt: true,
        // metadata exclue pour limiter la surface d'exposition
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const issues: {
      txId: string;
      reference: string;
      issue: string;
      severity: string;
    }[] = [];

    for (const tx of pendingWithdraws) {
      const metadata = tx.metadata as Record<string, unknown> | null;
      const destination =
        (metadata?.externalAddress as string) ||
        (metadata?.destinationAddress as string) ||
        tx.accountNumber;

      if (!destination) {
        issues.push({
          txId: tx.id,
          reference: tx.reference,
          issue: "Pas d'adresse de destination",
          severity: "CRITICAL",
        });
      }

      if (tx.currency === "PI" && destination && !destination.startsWith("G")) {
        issues.push({
          txId: tx.id,
          reference: tx.reference,
          issue: `Adresse Pi invalide: ${destination.substring(0, 8)}...`,
          severity: "HIGH",
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      pendingWithdraws: {
        count: pendingWithdraws.length,
        transactions: pendingWithdraws.map((tx) => ({
          id: tx.id,
          reference: tx.reference,
          currency: tx.currency,
          amount: tx.amount,
          status: tx.status,
          blockchainTx: tx.blockchainTx,
          // accountNumber masqué
          fromUser: tx.fromUser?.username,
          createdAt: tx.createdAt,
        })),
      },
      recentTransactions: {
        count: recentTransactions.length,
        transactions: recentTransactions,
      },
      issues: { count: issues.length, list: issues },
      // FIX: on n'expose JAMAIS les valeurs d'env sensibles
      config: {
        PI_HORIZON_URL: process.env.PI_HORIZON_URL,
        PI_NETWORK_PASSPHRASE: process.env.PI_NETWORK_PASSPHRASE,
        PI_MASTER_WALLET_PRESENT: !!process.env.PI_MASTER_WALLET_ADDRESS,
        PI_MASTER_SECRET_PRESENT: !!process.env.PI_MASTER_WALLET_SECRET,
        PI_API_KEY_PRESENT: !!process.env.PI_API_KEY,
      },
    });
  } catch (error: unknown) {
    // FIX: error.stack jamais dans la réponse
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("[DEBUG] ERREUR transactions:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
