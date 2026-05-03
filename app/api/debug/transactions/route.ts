export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, TransactionType } from "@prisma/client";

/**
 * #3 FIX: Route bloquée en production.
 * Accessible uniquement en développement avec une clé DEBUG obligatoire.
 */
export async function GET(req: NextRequest) {
  // Bloquer totalement en production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // En développement, la clé DEBUG est obligatoire (plus de fallback libre)
  const apiKey = req.headers.get('x-debug-key');
  const expectedKey = process.env.DEBUG_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pendingWithdraws = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        blockchainTx: null,
      },
      include: {
        fromUser: {
          select: { id: true, username: true, piUserId: true }
        },
        toUser: {
          select: { id: true, username: true }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true, reference: true, currency: true, amount: true,
        status: true, blockchainTx: true, accountNumber: true,
        createdAt: true, metadata: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const issues = [];
    for (const tx of pendingWithdraws) {
      const metadata = tx.metadata as any;
      const destination = metadata?.externalAddress || metadata?.destinationAddress || tx.accountNumber;
      if (!destination) {
        issues.push({ txId: tx.id, reference: tx.reference, issue: "Pas d'adresse de destination", severity: "CRITICAL" });
      }
      if (tx.currency === "PI" && destination && !destination.startsWith('G')) {
        issues.push({ txId: tx.id, reference: tx.reference, issue: `Adresse Pi invalide: ${destination?.substring(0, 20)}...`, severity: "HIGH" });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      pendingWithdraws: {
        count: pendingWithdraws.length,
        transactions: pendingWithdraws.map(tx => ({
          id: tx.id, reference: tx.reference, currency: tx.currency,
          amount: tx.amount, status: tx.status, blockchainTx: tx.blockchainTx,
          accountNumber: tx.accountNumber, fromUser: tx.fromUser?.username,
          createdAt: tx.createdAt,
        }))
      },
      recentTransactions: { count: recentTransactions.length, transactions: recentTransactions },
      issues: { count: issues.length, list: issues },
      // #13 FIX: Pas d'exposition de variables d'environnement sensibles
    });

  } catch (error: any) {
    // #14 FIX: Pas de stack trace dans la réponse
    console.error("[DEBUG] ERREUR:", error.message, error.stack);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
