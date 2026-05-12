export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
import { getBnbBalance } from "@/lib/blockchain/bnb";

/**
 * POST /api/wallet/bnb/sync
 *
 * Synchronise le solde BNB (BSC/BEP20) du wallet PimPay avec le solde réel
 * sur la Binance Smart Chain. Utilise la même adresse EVM que Sidra (sidraAddress).
 *
 * Body optionnel :
 *   { realBlockchainBalance: number }  → si fourni, on l'utilise directement
 *                                        sinon on le fetch depuis le RPC BSC.
 *
 * Réponse :
 *   { success, total, added, message }
 */
export async function POST(req: Request) {
  try {
    // ─── 1. AUTHENTIFICATION ────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ─── 2. LECTURE DU BODY (optionnel) ─────────────────────────────────────
    let blockchainBalance: number | null = null;

    try {
      const rawText = await req.text();
      if (rawText && rawText.trim()) {
        const body = JSON.parse(rawText);
        if (
          body?.realBlockchainBalance !== undefined &&
          body?.realBlockchainBalance !== null
        ) {
          const val = body.realBlockchainBalance;
          const num =
            typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
          if (!isNaN(num)) {
            blockchainBalance = num;
          }
        }
      }
    } catch {
      // Body absent ou invalide — on ira chercher le solde sur la blockchain
    }

    // ─── 3. FETCH DU SOLDE BSC SI NON FOURNI ────────────────────────────────
    if (blockchainBalance === null) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sidraAddress: true }, // BNB partage l'adresse EVM (sidraAddress)
      });

      if (!user?.sidraAddress) {
        // Pas d'adresse EVM configurée → on retourne le solde actuel sans erreur
        const existingWallet = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: "BNB" } },
        });
        return NextResponse.json({
          success: true,
          total: existingWallet?.balance ?? 0,
          added: 0,
          message: "Aucune adresse BNB configurée",
        });
      }

      try {
        const balanceStr = await getBnbBalance(user.sidraAddress);
        blockchainBalance = parseFloat(balanceStr);
        if (isNaN(blockchainBalance)) {
          blockchainBalance = 0;
        }
      } catch (err) {
        console.error("[BNB_SYNC] Erreur lecture BSC blockchain:", err);
        const existingWallet = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: "BNB" } },
        });
        return NextResponse.json({
          success: true,
          total: existingWallet?.balance ?? 0,
          added: 0,
          message: "Impossible de contacter la BSC, réessayez plus tard",
        });
      }
    }

    // ─── 4. TRANSACTION ATOMIQUE ─────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // Upsert du wallet BNB
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "BNB" } },
          update: { type: WalletType.CRYPTO },
          create: {
            userId,
            currency: "BNB",
            balance: 0,
            type: WalletType.CRYPTO,
          },
        });

        const currentBalance = wallet.balance;
        const diff = Number((blockchainBalance! - currentBalance).toFixed(18));

        // Déjà synchronisé (seuil de 0.00000001 BNB)
        if (Math.abs(diff) < 0.00000001) {
          return {
            updated: false,
            total: currentBalance,
            reason: "ALREADY_SYNC",
          };
        }

        // Anti-spam : 30 secondes entre deux syncs
        const lastTx = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            toWalletId: wallet.id,
            currency: "BNB",
            type: TransactionType.DEPOSIT,
            OR: [
              { description: { contains: "Synchronisation" } },
              { description: { contains: "Dépôt BNB" } },
              { description: { contains: "Depot BNB" } },
            ],
            createdAt: { gte: new Date(Date.now() - 30 * 1000) },
          },
        });

        if (lastTx) {
          return {
            updated: false,
            total: currentBalance,
            reason: "THROTTLED",
          };
        }

        // Mise à jour du solde
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: blockchainBalance! },
        });

        const txReference = `BNB-DEP-${nanoid(10).toUpperCase()}`;

        // On crée une transaction de dépôt seulement si la différence est positive
        if (diff > 0) {
          await tx.transaction.create({
            data: {
              reference: txReference,
              amount: Math.abs(diff),
              currency: "BNB",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt BNB (BSC) (+${diff.toFixed(8)} BNB)`,
              toUserId: userId,
              toWalletId: updatedWallet.id,
              metadata: {
                blockchainBalance: blockchainBalance!,
                previousBalance: currentBalance,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "BSC_MAINNET",
                network: "BSC (BEP20)",
              } as Prisma.JsonObject,
            },
          });

          // Notification push dans l'app
          await tx.notification.create({
            data: {
              userId,
              title: "Dépôt BNB reçu !",
              message: `Vous avez reçu ${diff.toFixed(8)} BNB sur le réseau BSC (BEP20).`,
              type: "SUCCESS",
              read: false,
              metadata: JSON.stringify({
                amount: diff,
                currency: "BNB",
                method: "BSC_BLOCKCHAIN",
                reference: txReference,
                status: "SUCCESS",
                network: "BSC (BEP20)",
                previousBalance: currentBalance,
                newBalance: blockchainBalance!,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "BSC_MAINNET",
              }),
            },
          });
        }

        // Si la différence est négative (envoi détecté), on met à jour le solde
        // sans créer de transaction de dépôt (la transaction d'envoi est gérée ailleurs)

        return {
          updated: true,
          total: updatedWallet.balance,
          added: diff,
          reference: diff > 0 ? txReference : null,
        };
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );

    // ─── 5. RÉPONSE ──────────────────────────────────────────────────────────
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
      message: result.updated ? "Synchronisation BNB réussie" : "Solde déjà à jour",
    });
  } catch (error: any) {
    console.error("[BNB_SYNC_FATAL]:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la synchronisation BNB",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
