export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, TransactionType } from "@prisma/client";

/**
 * Endpoint de diagnostic pour voir les transactions en attente
 * Accessible uniquement en development ou avec une clé API
 */
export async function GET(req: NextRequest) {
  try {
    // Optionnel: Verifier une clé API pour la securite
    const apiKey = req.headers.get('x-debug-key');
    const expectedKey = process.env.DEBUG_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Recuperer tous les transferts externes en attente
    const pendingWithdraws = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        blockchainTx: null,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            piUserId: true,
          }
        },
        toUser: {
          select: {
            id: true,
            username: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Recuperer les transactions recentes (last 24h)
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
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
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Analyser les problemes potentiels
    const issues = [];

    for (const tx of pendingWithdraws) {
      const metadata = tx.metadata as any;
      const destination = metadata?.externalAddress || metadata?.destinationAddress || tx.accountNumber;
      
      if (!destination) {
        issues.push({
          txId: tx.id,
          reference: tx.reference,
          issue: "Pas d'adresse de destination",
          severity: "CRITICAL"
        });
      }

      if (tx.currency === "PI") {
        // Valider que c'est une adresse Stellar valide
        if (destination && !destination.startsWith('G')) {
          issues.push({
            txId: tx.id,
            reference: tx.reference,
            issue: `Adresse Pi invalide (ne commence pas par G): ${destination?.substring(0, 20)}...`,
            severity: "HIGH"
          });
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      pendingWithdraws: {
        count: pendingWithdraws.length,
        transactions: pendingWithdraws.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          currency: tx.currency,
          amount: tx.amount,
          status: tx.status,
          blockchainTx: tx.blockchainTx,
          accountNumber: tx.accountNumber,
          metadata: tx.metadata,
          fromUser: tx.fromUser?.username,
          createdAt: tx.createdAt,
        }))
      },
      recentTransactions: {
        count: recentTransactions.length,
        transactions: recentTransactions
      },
      issues: {
        count: issues.length,
        list: issues
      },
      config: {
        PI_HORIZON_URL: process.env.PI_HORIZON_URL,
        PI_NETWORK_PASSPHRASE: process.env.PI_NETWORK_PASSPHRASE,
        PI_MASTER_WALLET_ADDRESS: process.env.PI_MASTER_WALLET_ADDRESS?.substring(0, 15) + "...",
        PI_MASTER_WALLET_SECRET_PRESENT: !!process.env.PI_MASTER_WALLET_SECRET,
        PI_API_KEY_PRESENT: !!process.env.PI_API_KEY,
      }
    });

  } catch (error: any) {
    console.error("[v0] [DEBUG] ERREUR:", error.message);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
