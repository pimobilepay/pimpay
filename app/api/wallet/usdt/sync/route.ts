export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/usdt/sync
 *
 * Synchronise le solde USDT (TRC20) de l'utilisateur connecté avec le
 * solde réel sur la blockchain TRON (TronGrid API).
 *
 * - Si la balance on-chain > balance DB  → on crédite la différence
 *   et on crée une transaction DEPOSIT dans l'historique.
 * - Si la balance on-chain <= balance DB → rien (solde déjà à jour).
 * - Anti-spam : 1 sync toutes les 30 secondes maximum.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import {
  TransactionStatus,
  TransactionType,
  WalletType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";

// Adresse du contrat USDT (TRC20) sur le mainnet TRON
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

/**
 * Récupère le solde USDT TRC20 d'une adresse TRON
 * via l'API REST TronGrid (pas besoin de TronWeb).
 */
async function fetchUsdtBalance(tronAddress: string): Promise<number> {
  // On essaie d'abord l'API TRC20 token balance de TronGrid
  const endpoints = [
    `https://api.trongrid.io/v1/accounts/${tronAddress}/tokens/trc20?contract_address=${USDT_CONTRACT}`,
    `https://api.shasta.trongrid.io/v1/accounts/${tronAddress}/tokens/trc20?contract_address=${USDT_CONTRACT}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(process.env.TRONGRID_API_KEY
            ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
            : {}),
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();

      // Format TronGrid v1: data est un tableau de { tokenId, balance, ... }
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const tokenData = data.data[0];
        const raw = tokenData?.balance ?? tokenData?.amount ?? "0";
        return Number(raw) / 1_000_000; // USDT a 6 décimales
      }

      // Solde 0 = pas de tokens TRC20 sur ce compte → valide
      return 0;
    } catch {
      // Essayer l'endpoint suivant
    }
  }

  // Fallback : lire le compte complet et chercher USDT dans trc20
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(process.env.TRONGRID_API_KEY
            ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
            : {}),
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`TronGrid HTTP ${res.status}`);

    const data = await res.json();

    // Le compte existe → chercher USDT dans la liste trc20
    if (data?.data?.[0]?.trc20) {
      const trc20List: Record<string, string>[] = data.data[0].trc20;
      const usdtEntry = trc20List.find((t) =>
        Object.keys(t).some(
          (k) => k.toLowerCase() === USDT_CONTRACT.toLowerCase()
        )
      );
      if (usdtEntry) {
        const raw = Object.values(usdtEntry)[0] ?? "0";
        return Number(raw) / 1_000_000;
      }
    }

    // Compte inexistant ou pas de USDT
    return 0;
  } catch (err: any) {
    console.error("[USDT_SYNC] Erreur TronGrid:", err.message);
    throw new Error(`Impossible de contacter TronGrid: ${err.message}`);
  }
}

export async function POST(req: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ── 2. Récupérer l'adresse USDT de l'utilisateur ─────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtAddress: true },
    });

    if (!user?.usdtAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse USDT configurée",
      });
    }

    // ── 3. Fetch du solde on-chain ────────────────────────────────────────────
    let blockchainBalance: number;
    try {
      blockchainBalance = await fetchUsdtBalance(user.usdtAddress);
    } catch (err: any) {
      // En cas d'erreur réseau, renvoyer le solde DB sans planter
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "TronGrid indisponible, réessayez plus tard",
      });
    }

    // ── 4. Mise à jour atomique en DB ─────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "USDT" } },
          update: { type: WalletType.CRYPTO },
          create: {
            userId,
            currency: "USDT",
            balance: 0,
            type: WalletType.CRYPTO,
          },
        });

        const currentBalance = wallet.balance;
        const diff = parseFloat(
          (blockchainBalance - currentBalance).toFixed(6)
        );

        // Déjà synchronisé (seuil 0.000001 USDT)
        if (Math.abs(diff) < 0.000001) {
          return { updated: false, total: currentBalance, reason: "ALREADY_SYNC" };
        }

        // Anti-spam : 30 secondes entre deux syncs
        const lastSync = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency: "USDT",
            type: TransactionType.DEPOSIT,
            description: { contains: "TRC20" },
            createdAt: { gte: new Date(Date.now() - 30_000) },
          },
        });

        if (lastSync) {
          return { updated: false, total: currentBalance, reason: "THROTTLED" };
        }

        // Mettre à jour le solde
        const updated = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: blockchainBalance },
        });

        const reference = `USDT-DEP-${nanoid(10).toUpperCase()}`;

        // Créer une transaction DEPOSIT si le solde a augmenté
        if (diff > 0) {
          await tx.transaction.create({
            data: {
              reference,
              amount: diff,
              currency: "USDT",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt USDT TRC20 (+${diff.toFixed(6)} USDT)`,
              toUserId: userId,
              toWalletId: updated.id,
              metadata: {
                blockchainBalance,
                previousBalance: currentBalance,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "TRON_MAINNET",
                network: "TRC20 (TRON)",
                contractAddress: USDT_CONTRACT,
              } as Prisma.JsonObject,
            },
          });

          await tx.notification.create({
            data: {
              userId,
              title: "Dépôt USDT reçu !",
              message: `Vous avez reçu ${diff.toFixed(6)} USDT (TRC20) sur votre wallet PimPay.`,
              type: "SUCCESS",
              read: false,
              metadata: JSON.stringify({
                amount: diff,
                currency: "USDT",
                network: "TRC20 (TRON)",
                reference,
                status: "SUCCESS",
                previousBalance: currentBalance,
                newBalance: blockchainBalance,
              }),
            },
          });
        }

        return {
          updated: true,
          total: updated.balance,
          added: diff,
          reference: diff > 0 ? reference : null,
        };
      },
      { timeout: 30_000, maxWait: 10_000 }
    );

    // ── 5. Réponse ────────────────────────────────────────────────────────────
    if (!result.updated && result.reason === "THROTTLED") {
      return NextResponse.json(
        { error: "Veuillez patienter 30s avant une nouvelle synchronisation" },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.updated ? result.added : 0,
      message: result.updated ? "Synchronisation USDT réussie" : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[USDT_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation USDT" },
      { status: 500 }
    );
  }
}
