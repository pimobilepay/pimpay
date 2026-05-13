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
 * Récupère le solde USDT TRC20 d'une adresse TRON.
 *
 * PROBLÈME ADRESSE INACTIVÉE :
 * Sur TRON, une adresse est "inactivée" tant qu'elle n'a jamais reçu de TRX.
 * TronGrid /v1/accounts/{addr} retourne data:[] pour ces adresses → solde 0
 * même si des USDT y ont été reçus via transfert TRC20.
 *
 * SOLUTION — 3 stratégies en cascade :
 *  1. TronScan transfers API  → fonctionne MÊME sur adresses inactivées (lit les tx du contrat)
 *  2. TronGrid /tokens/trc20  → fonctionne si le compte est activé
 *  3. TronGrid /accounts      → fallback final pour comptes activés
 */
async function fetchUsdtBalance(tronAddress: string): Promise<number> {
  const tronHeaders: Record<string, string> = { Accept: "application/json" };
  if (process.env.TRONGRID_API_KEY) {
    tronHeaders["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  }

  // ── Stratégie 1 : TronScan transfers — FONCTIONNE SUR ADRESSES INACTIVÉES ──
  // Lit directement les transferts du contrat USDT, indépendamment de l'état du compte
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const url =
      `https://apilist.tronscanapi.com/api/token_trc20/transfers` +
      `?toAddress=${tronAddress}&contract_address=${USDT_CONTRACT}&limit=200&start=0`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      const transfers: Array<{
        transferToAddress: string;
        transferFromAddress: string;
        quant: string;
      }> = data?.token_transfers ?? data?.data ?? [];

      if (transfers.length > 0) {
        // Calculer le solde net : somme des entrées − somme des sorties
        let netRaw = 0n;
        for (const t of transfers) {
          const amount = BigInt(t.quant ?? "0");
          if (t.transferToAddress === tronAddress) netRaw += amount;
          if (t.transferFromAddress === tronAddress) netRaw -= amount;
        }
        const balance = Number(netRaw < 0n ? 0n : netRaw) / 1_000_000;
        console.log(`[USDT_SYNC] TronScan balance pour ${tronAddress.substring(0, 8)}...: ${balance} USDT`);
        return balance;
      }
      // Aucun transfert trouvé = solde 0 (adresse vierge)
      // On continue quand même avec les autres stratégies au cas où TronScan est incomplet
    }
  } catch (e: any) {
    console.warn("[USDT_SYNC] TronScan indisponible, essai TronGrid:", e.message);
  }

  // ── Stratégie 2 : TronGrid /tokens/trc20 (comptes activés) ──
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}/tokens/trc20`,
      { signal: controller.signal, headers: tronHeaders }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        for (const token of data.data) {
          const contractAddr: string = token?.tokenId ?? token?.token_id ?? "";
          if (contractAddr.toLowerCase() === USDT_CONTRACT.toLowerCase()) {
            return Number(token.balance ?? token.amount ?? "0") / 1_000_000;
          }
        }
        return 0; // Tokens présents mais pas USDT
      }
      // data vide = adresse inactivée ou pas de tokens — on continue
    }
  } catch {
    // Continuer avec le fallback
  }

  // ── Stratégie 3 : TronGrid /v1/accounts (fallback comptes activés) ──
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}`,
      { signal: controller.signal, headers: tronHeaders }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.trc20) {
        const trc20List: Record<string, string>[] = data.data[0].trc20;
        const entry = trc20List.find((t) =>
          Object.keys(t).some(
            (k) => k.toLowerCase() === USDT_CONTRACT.toLowerCase()
          )
        );
        if (entry) {
          return Number(Object.values(entry)[0] ?? "0") / 1_000_000;
        }
      }
      // Compte retourné mais sans USDT
      if (data?.data?.length > 0) return 0;
    }
  } catch (err: any) {
    console.error("[USDT_SYNC] Toutes les stratégies ont échoué:", err.message);
  }

  // Si toutes les stratégies retournent sans résultat = solde 0 (adresse inactivée sans USDT)
  return 0;
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
