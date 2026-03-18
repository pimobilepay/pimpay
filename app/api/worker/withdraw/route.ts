// app/api/worker/withdraw/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";

/**
 * Sécurise l'accès : le worker doit envoyer le header:
 *  x-worker-secret: <WORKER_SECRET>
 */
function assertWorkerAuth(req: NextRequest) {
  const secret = process.env.WORKER_SECRET;
  const header = req.headers.get("x-worker-secret");
  if (!secret || !header || header !== secret) {
    throw new Error("Unauthorized worker");
  }
}

type WithdrawJob = {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  fromUserId: string | null;
  fromWalletId: string | null;
  status: TransactionStatus;
  statusClass: string | null;
  blockchainTx: string | null;
  metadata: any;
  createdAt: Date;
};

function getExternalAddress(job: WithdrawJob): string | null {
  const m = job.metadata;
  if (!m || typeof m !== "object") return null;
  return typeof m.externalAddress === "string" ? m.externalAddress : null;
}

function getDetectedNetwork(job: WithdrawJob): string | null {
  const m = job.metadata;
  if (!m || typeof m !== "object") return null;
  return typeof m.detectedNetwork === "string" ? m.detectedNetwork : null;
}

/**
 * Broadcast les retraits vers la blockchain appropriée
 * Retourne un hash/txid (string) si ok
 */
async function broadcastWithdraw(job: WithdrawJob): Promise<string> {
  const address = getExternalAddress(job);
  if (!address) throw new Error("Missing externalAddress in metadata");

  const currency = job.currency.toUpperCase();
  
  // Support pour Pi Network
  if (currency === "PI") {
    return await broadcastPiWithdraw(job, address);
  }

  // TODO: Supporter d'autres blockchains:
  // - TRON (USDT TRC20): TronWeb + contrat USDT
  // - EVM (USDT-ERC20, ETH, BNB, etc.): ethers + RPC
  // - XRP: xrpl
  // - STELLAR_LIKE (XLM): stellar-sdk
  // - BTC/LTC: lib bitcoin + node/third-party API
  
  throw new Error(`Broadcast non implémenté pour ${currency}`);
}

/**
 * Broadcast Pi Network - Envoie des Pi vers une adresse externe via Horizon API
 * Note: Cette fonction enregistre la transaction de retrait dans Horizon
 * Le Pi Network validera la signature et confirmera la transaction
 */
async function broadcastPiWithdraw(job: WithdrawJob, toAddress: string): Promise<string> {
  const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
  const PI_API_KEY = process.env.PI_API_KEY;
  const PI_MASTER_WALLET = process.env.PI_MASTER_WALLET_ADDRESS;

  if (!PI_API_KEY || !PI_MASTER_WALLET) {
    throw new Error("Configuration Pi Network manquante (PI_API_KEY ou PI_MASTER_WALLET_ADDRESS)");
  }

  // Valider l'adresse Pi (commence par G et 56 caractères)
  if (!toAddress.startsWith("G") || toAddress.length !== 56) {
    throw new Error(`Adresse Pi invalide: ${toAddress}`);
  }

  try {
    // Créer une transaction de retrait Pi Network
    // Ceci enregistre la transaction dans Horizon pour qu'elle soit traitée
    const withdrawResponse = await fetch(`${PI_HORIZON_URL}/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PI_API_KEY}`,
      },
      body: JSON.stringify({
        to: toAddress,
        amount: job.amount.toString(),
        memo: job.reference,
        metadata: {
          fromUser: job.fromUserId,
          timestamp: new Date().toISOString(),
        }
      })
    });

    if (!withdrawResponse.ok) {
      const errorData = await withdrawResponse.json().catch(() => ({}));
      throw new Error(`Horizon API error: ${errorData.error || withdrawResponse.statusText}`);
    }

    const result = await withdrawResponse.json();
    
    // Horizon retourne un transaction ID
    if (!result.transactionHash && !result.hash && !result.id) {
      throw new Error("Pas de transaction hash retourné par Horizon");
    }

    const txHash = result.transactionHash || result.hash || result.id;
    console.log(`[PI_WITHDRAW] Transaction créée avec succès: ${txHash} pour ${job.amount} π vers ${toAddress}`);
    
    return txHash;

  } catch (error: any) {
    console.error(`[PI_WITHDRAW_ERROR] Broadcast échoué pour job ${job.id}:`, error.message);
    throw new Error(`Impossible de broadcaster la transaction Pi: ${error.message}`);
  }
}

/**
 * GET: état rapide du worker (optionnel)
 * POST: lance un scan + processing
 */
export async function GET(req: NextRequest) {
  try {
    assertWorkerAuth(req);

    const [pendingCount, processingCount, doneCount] = await Promise.all([
      prisma.transaction.count({
        where: {
          type: TransactionType.WITHDRAW,
          blockchainTx: null,
          status: TransactionStatus.SUCCESS, // tes withdraw sont SUCCESS
          OR: [{ statusClass: null }, { statusClass: { in: ["QUEUED", "RETRY"] } }],
        },
      }),
      prisma.transaction.count({
        where: { type: TransactionType.WITHDRAW, statusClass: "PROCESSING" },
      }),
      prisma.transaction.count({
        where: { type: TransactionType.WITHDRAW, statusClass: "BROADCASTED" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      withdrawQueue: {
        ready: pendingCount,
        processing: processingCount,
        broadcasted: doneCount,
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Worker error";
    const code = msg === "Unauthorized worker" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertWorkerAuth(req);

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
    const dryRun = url.searchParams.get("dryRun") === "true";

    const jobs = await prisma.transaction.findMany({
      where: {
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.SUCCESS,  // Transactions de retrait créées comme SUCCESS
        blockchainTx: null,                // pas encore broadcast
        AND: [
          {
            OR: [
              { statusClass: null },
              { statusClass: { in: ["QUEUED", "RETRY"] } },
            ]
          }
        ]
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const results: Array<{
      id: string;
      reference: string;
      claimed: boolean;
      ok: boolean;
      dryRun?: boolean;
      blockchainTx?: string;
      error?: string;
    }> = [];

    for (const job of jobs as unknown as WithdrawJob[]) {
      // 1) Claim atomique anti double-worker
      const claimed = await prisma.transaction.updateMany({
        where: {
          id: job.id,
          blockchainTx: null,
          // on claim uniquement si pas déjà processing
          OR: [{ statusClass: null }, { statusClass: { in: ["QUEUED", "RETRY"] } }],
        },
        data: { statusClass: "PROCESSING" },
      });

      if (claimed.count === 0) {
        results.push({
          id: job.id,
          reference: job.reference,
          claimed: false,
          ok: false,
          error: "Already claimed",
        });
        continue;
      }

      // 2) Dry-run : on relâche en QUEUED
      if (dryRun) {
        await prisma.transaction.update({
          where: { id: job.id },
          data: {
            statusClass: "QUEUED",
            metadata: {
              ...(typeof job.metadata === "object" && job.metadata ? job.metadata : {}),
              workerLastDryRunAt: new Date().toISOString(),
            },
          },
        });

        results.push({
          id: job.id,
          reference: job.reference,
          claimed: true,
          ok: true,
          dryRun: true,
        });
        continue;
      }

      // 3) Broadcast réel
      try {
        const txHash = await broadcastWithdraw(job);

        await prisma.transaction.update({
          where: { id: job.id },
          data: {
            blockchainTx: txHash,
            statusClass: "BROADCASTED",
            metadata: {
              ...(typeof job.metadata === "object" && job.metadata ? job.metadata : {}),
              broadcastedAt: new Date().toISOString(),
              broadcastTx: txHash,
            },
          },
        });

        results.push({
          id: job.id,
          reference: job.reference,
          claimed: true,
          ok: true,
          blockchainTx: txHash,
        });
      } catch (err: any) {
        const refundOnFail = process.env.REFUND_ON_WITHDRAW_FAIL === "true";
        const errorMsg = err?.message || "Broadcast failed";

        // Marque l’échec
        // (Tu as demandé SUCCESS au moment de création; ici on peut mettre FAILED si tu veux refléter la réalité.)
        // Si tu veux conserver SUCCESS coûte que coûte, remplace FAILED par SUCCESS et garde statusClass=FAILED_BROADCAST.
        const updated = await prisma.transaction.update({
          where: { id: job.id },
          data: {
            status: TransactionStatus.FAILED,
            statusClass: "FAILED_BROADCAST",
            metadata: {
              ...(typeof job.metadata === "object" && job.metadata ? job.metadata : {}),
              broadcastError: errorMsg,
              broadcastFailedAt: new Date().toISOString(),
            },
          },
        });

        // Refund optionnel (amount + fee), uniquement si fromWalletId existe
        if (refundOnFail && updated.fromWalletId) {
          const alreadyRefunded =
            updated.metadata &&
            typeof updated.metadata === "object" &&
            updated.metadata.refunded === true;

          if (!alreadyRefunded) {
            const total = (updated.amount || 0) + (updated.fee || 0);

            await prisma.$transaction([
              prisma.wallet.update({
                where: { id: updated.fromWalletId },
                data: { balance: { increment: total } },
              }),
              prisma.transaction.update({
                where: { id: updated.id },
                data: {
                  metadata: {
                    ...(typeof updated.metadata === "object" && updated.metadata ? updated.metadata : {}),
                    refunded: true,
                    refundedAt: new Date().toISOString(),
                    refundedTotal: total,
                  },
                },
              }),
            ]);
          }
        }

        results.push({
          id: job.id,
          reference: job.reference,
          claimed: true,
          ok: false,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (e: any) {
    const msg = e?.message || "Worker error";
    const code = msg === "Unauthorized worker" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
