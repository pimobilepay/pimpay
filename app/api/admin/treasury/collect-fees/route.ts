export const dynamic = "force-dynamic";

/**
 * API Admin — Collecte manuelle des frais on-chain
 *
 * GET  → Retourne l'adresse centrale et le solde actuel par réseau
 * POST → Déclenche une collecte manuelle pour les frais en attente (BNB, ETH, SDA)
 *
 * TRX, USDT et PI sont exclus de cette collecte.
 */

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { decrypt } from "@/lib/crypto";
import {
  FEE_COLLECTOR_ADDRESS,
  FEE_COLLECTED_CURRENCIES,
  collectFeeOnChain,
  getCentralFeeAddress,
  getAllCentralFeeAddresses,
} from "@/lib/fee-collector";

const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  BNB: "https://bsc-dataseed1.binance.org",
  ETH: "https://cloudflare-eth.com",
};

const EXPLORER_URLS: Record<string, string> = {
  SDA: "https://explorer.sidrachain.com",
  BNB: "https://bscscan.com",
  ETH: "https://etherscan.io",
};

// ─── GET — infos sur l'adresse centrale ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Lire les soldes on-chain de l'adresse centrale pour chaque réseau
    const networks = await Promise.all(
      (["SDA", "BNB", "ETH"] as const).map(async (currency) => {
        try {
          const provider = new ethers.JsonRpcProvider(RPC_URLS[currency]);
          const rawBalance = await Promise.race([
            provider.getBalance(FEE_COLLECTOR_ADDRESS),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 8000)
            ),
          ]);
          const balance = parseFloat(ethers.formatEther(rawBalance));
          return {
            currency,
            balance,
            explorerUrl: `${EXPLORER_URLS[currency]}/address/${FEE_COLLECTOR_ADDRESS}`,
            error: null,
          };
        } catch (err: any) {
          return {
            currency,
            balance: null,
            explorerUrl: `${EXPLORER_URLS[currency]}/address/${FEE_COLLECTOR_ADDRESS}`,
            error: err.message,
          };
        }
      })
    );

    // Frais accumulés en DB non encore collectés, groupés par devise (TOUTES devises)
    const pendingFees = await prisma.transaction.groupBy({
      by: ["currency"],
      where: {
        fee: { gt: 0 },
        status: "SUCCESS",
        NOT: { type: "FEE_COLLECTION" as any },
      },
      _sum: { fee: true },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      // Adresse EVM historique (compat)
      centralAddress: FEE_COLLECTOR_ADDRESS,
      // Toutes les adresses centrales par réseau
      centralAddresses: getAllCentralFeeAddresses(),
      collectedCurrencies: FEE_COLLECTED_CURRENCIES,
      networks,
      pendingFeesSummary: pendingFees.map((f) => ({
        currency: f.currency,
        centralAddress: getCentralFeeAddress(f.currency),
        totalFees: f._sum?.fee ?? 0,
        transactionCount: f._count?.id ?? 0,
      })),
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[collect-fees GET] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}

// ─── POST — collecte manuelle des frais depuis les wallets utilisateurs ───────
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Optionnel : filtrer sur une devise spécifique
    const targetCurrency: string | null = body.currency?.toUpperCase() || null;

    const currencies = targetCurrency
      ? FEE_COLLECTED_CURRENCIES.filter((c) => c === targetCurrency)
      : [...FEE_COLLECTED_CURRENCIES];

    if (targetCurrency && currencies.length === 0) {
      return NextResponse.json(
        {
          error: `Devise ${targetCurrency} non prise en charge. Devises valides: ${FEE_COLLECTED_CURRENCIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Récupérer les transactions avec frais non collectés, groupées par user
    const transactionsWithFees = await prisma.transaction.findMany({
      where: {
        currency: { in: currencies },
        fee: { gt: 0 },
        status: "SUCCESS",
        // Exclure les transactions déjà collectées
        NOT: { type: "FEE_COLLECTION" as any },
      },
      select: {
        id: true,
        currency: true,
        fee: true,
        fromUserId: true,
        fromUser: {
          select: { sidraPrivateKey: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Par batch de 50
    });

    const results: Array<{
      transactionId: string;
      currency: string;
      fee: number;
      result: Awaited<ReturnType<typeof collectFeeOnChain>>;
    }> = [];

    // Grouper par (currency, userId) pour éviter les doubles envois
    const processed = new Set<string>();

    for (const tx of transactionsWithFees) {
      const key = `${tx.currency}-${tx.fromUserId}`;
      if (processed.has(key)) continue;
      processed.add(key);

      if (!tx.fromUser?.sidraPrivateKey) continue;

      let privateKey = tx.fromUser.sidraPrivateKey;
      try {
        if (privateKey.includes(":")) privateKey = decrypt(privateKey);
        if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
        if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) continue;
      } catch {
        continue;
      }

      // Calculer le total des frais pour cet utilisateur + devise
      const userFeeTotal = transactionsWithFees
        .filter((t) => t.currency === tx.currency && t.fromUserId === tx.fromUserId)
        .reduce((sum, t) => sum + (t.fee ?? 0), 0);

      const collectResult = await collectFeeOnChain(
        tx.currency,
        userFeeTotal,
        privateKey
      );

      results.push({
        transactionId: tx.id,
        currency: tx.currency,
        fee: userFeeTotal,
        result: collectResult,
      });

      // Marquer les transactions comme collectées si succès
      if (collectResult.success && !collectResult.skipped && collectResult.txHash) {
        const txIds = transactionsWithFees
          .filter((t) => t.currency === tx.currency && t.fromUserId === tx.fromUserId)
          .map((t) => t.id);

        await prisma.transaction.create({
          data: {
            reference: `FEE-COLL-${Date.now()}-${tx.currency}`,
            amount: userFeeTotal,
            netAmount: userFeeTotal,
            currency: tx.currency,
            type: "FEE_COLLECTION" as any,
            status: "SUCCESS",
            fromUserId: tx.fromUserId ?? "system",
            toUserId: "system",
            fee: 0,
            description: `Collecte frais ${tx.currency} → ${getCentralFeeAddress(tx.currency)}`,
            blockchainTx: collectResult.txHash,
            metadata: {
              centralAddress: getCentralFeeAddress(tx.currency),
              network: collectResult.network,
              sourceTransactionIds: txIds,
              collectedAt: new Date().toISOString(),
            },
          },
        }).catch(() => {
          // Non-bloquant
        });
      }
    }

    const succeeded = results.filter((r) => r.result.success && !r.result.skipped);
    const skipped = results.filter((r) => r.result.skipped);
    const failed = results.filter((r) => !r.result.success);
    const totalCollected = succeeded.reduce((sum, r) => sum + r.fee, 0);

    return NextResponse.json({
      success: true,
      centralAddress: FEE_COLLECTOR_ADDRESS,
      summary: {
        total: results.length,
        succeeded: succeeded.length,
        skipped: skipped.length,
        failed: failed.length,
        totalCollected,
      },
      results,
    });
  } catch (error: any) {
    console.error("[collect-fees POST] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
