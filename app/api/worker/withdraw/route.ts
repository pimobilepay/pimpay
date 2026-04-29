// app/api/worker/withdraw/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";
import * as StellarSdk from "@stellar/stellar-sdk";

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
 * Broadcast Pi Network - Envoie des Pi vers une adresse externe via Stellar SDK
 * Pi Network utilise le protocole Stellar, donc on utilise le SDK Stellar pour créer et signer la transaction
 * 
 * Flux:
 * 1. Charger le compte source depuis Horizon
 * 2. Créer une transaction avec une opération de paiement
 * 3. Signer avec la clé secrète du master wallet
 * 4. Soumettre à Horizon
 */
async function broadcastPiWithdraw(job: WithdrawJob, toAddress: string): Promise<string> {
  // Configuration Pi Network (utilise le protocole Stellar)
  // TESTNET: https://api.testnet.minepi.com avec passphrase "Pi Testnet"
  // MAINNET: https://api.mainnet.minepi.com avec passphrase "Pi Network"
  const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
  const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;
  const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
  const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Network";

  if (!PI_MASTER_SECRET || !PI_MASTER_ADDRESS) {
    throw new Error("Configuration Pi Network manquante (PI_MASTER_WALLET_SECRET ou PI_MASTER_WALLET_ADDRESS)");
  }

  // Log de debug pour vérifier la configuration testnet
  console.log(`[PI_WITHDRAW] Configuration:`, {
    horizonUrl: PI_HORIZON_URL,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
    masterAddress: PI_MASTER_ADDRESS.substring(0, 10) + "...",
    destinationAddress: toAddress,
    amount: job.amount,
    isTestnet: PI_HORIZON_URL.includes("testnet") || PI_NETWORK_PASSPHRASE.includes("Testnet")
  });

  // Valider l'adresse de destination (format Stellar Ed25519)
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(toAddress)) {
    throw new Error(`Adresse Pi invalide: ${toAddress}`);
  }

  try {
    // 1. Connexion au serveur Horizon Pi Network
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL, { allowHttp: PI_HORIZON_URL.includes("localhost") });
    
    // 2. Charger le compte source (Master Wallet PimPay)
    const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
    
    // 3. Vérifier que le compte source a assez de fonds
    const piBalance = sourceAccount.balances.find(
      (b: any) => b.asset_type === "native" || (b.asset_code === "PI" && b.asset_type !== "native")
    );
    
    if (!piBalance || parseFloat(piBalance.balance) < job.amount) {
      throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI, Requis: ${job.amount} PI`);
    }

    // 4. Récupérer les frais dynamiques du réseau
    let dynamicFee: string;
    try {
      const baseFee = await server.fetchBaseFee();
      // Utiliser 3x les frais de base pour garantir la confirmation, minimum 5000 stroops
      dynamicFee = String(Math.max(baseFee * 3, 5000));
      console.log(`[PI_WITHDRAW] Frais dynamiques: ${dynamicFee} stroops (base: ${baseFee})`);
    } catch (feeError: any) {
      // Fallback vers des frais fixes élevés si fetchBaseFee échoue
      dynamicFee = "10000";
      console.log(`[PI_WITHDRAW] Fallback frais: ${dynamicFee} stroops`);
    }

    // 5. Créer la transaction de paiement
    // Pi Network utilise Pi comme asset natif (comme XLM sur Stellar public)
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: dynamicFee,
      networkPassphrase: PI_NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: toAddress,
          asset: StellarSdk.Asset.native(), // Pi est l'asset natif sur Pi Network
          amount: job.amount.toFixed(7), // Stellar utilise 7 décimales max
        })
      )
      .addMemo(StellarSdk.Memo.text(job.reference.substring(0, 28))) // Memo max 28 chars
      .setTimeout(180) // 3 minutes timeout
      .build();

    // 5. Signer la transaction avec la clé secrète du Master Wallet
    const sourceKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
    transaction.sign(sourceKeypair);

    // 6. Soumettre la transaction à Horizon
    const result = await server.submitTransaction(transaction);

    if (!result.successful) {
      throw new Error(`Transaction échouée: ${JSON.stringify(result.extras?.result_codes || result)}`);
    }

    const txHash = result.hash;
    console.log(`[PI_WITHDRAW] Transaction soumise avec succès: ${txHash} pour ${job.amount} π vers ${toAddress}`);
    
    return txHash;

  } catch (error: any) {
    // Gérer les erreurs spécifiques de Stellar/Horizon
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      console.error(`[PI_WITHDRAW_ERROR] Codes d'erreur Horizon:`, codes);
      
      if (codes.transaction === "tx_bad_seq") {
        throw new Error("Erreur de séquence. Réessayez dans quelques secondes.");
      }
      if (codes.operations?.includes("op_underfunded")) {
        throw new Error("Solde Master Wallet insuffisant pour ce retrait.");
      }
      if (codes.operations?.includes("op_no_destination")) {
        throw new Error("Le compte destinataire n'existe pas sur Pi Network. L'utilisateur doit d'abord activer son wallet.");
      }
    }
    
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
            (updated.metadata as { refunded?: boolean }).refunded === true;

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
