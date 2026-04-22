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
import { getSidraBalance } from "@/lib/blockchain/sidra";

/**
 * POST /api/wallet/sidra/sync
 * 
 * Synchronise le solde Sidra du wallet PimPay avec le solde reel sur la blockchain.
 * Le body est optionnel : si `realBlockchainBalance` est fourni, on l'utilise ;
 * sinon on va le chercher directement sur la Sidra Chain via l'adresse de l'utilisateur.
 */
export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 2. LECTURE DU BODY (optionnel)
    let blockchainBalance: number | null = null;

    try {
      const rawText = await req.text();
      if (rawText && rawText.trim()) {
        const body = JSON.parse(rawText);
        if (body?.realBlockchainBalance !== undefined && body?.realBlockchainBalance !== null) {
          const val = body.realBlockchainBalance;
          const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
          if (!isNaN(num)) {
            blockchainBalance = num;
          }
        }
      }
    } catch {
      // Body absent ou invalide - on va chercher le solde sur la blockchain
    }

    // 3. SI PAS DE BALANCE FOURNIE, ON LA FETCH DEPUIS LA BLOCKCHAIN
    if (blockchainBalance === null) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sidraAddress: true },
      });

      if (!user?.sidraAddress) {
        // Pas d'adresse Sidra => on retourne simplement le solde actuel sans erreur
        const existingWallet = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: "SDA" } },
        });
        return NextResponse.json({
          success: true,
          total: existingWallet?.balance ?? 0,
          added: 0,
          message: "Aucune adresse Sidra configuree",
        });
      }

      try {
        const balanceStr = await getSidraBalance(user.sidraAddress);
        blockchainBalance = parseFloat(balanceStr);
        if (isNaN(blockchainBalance)) {
          blockchainBalance = 0;
        }
      } catch (err) {
        console.error("[SIDRA_SYNC] Erreur lecture blockchain:", err);
        // En cas d'erreur reseau blockchain, on retourne le solde actuel
        const existingWallet = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: "SDA" } },
        });
        return NextResponse.json({
          success: true,
          total: existingWallet?.balance ?? 0,
          added: 0,
          message: "Impossible de contacter la Sidra Chain, reessayez plus tard",
        });
      }
    }

    // 4. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { type: WalletType.SIDRA },
          create: {
            userId,
            currency: "SDA",
            balance: 0,
            type: WalletType.SIDRA,
          },
        });

        const currentBalance = wallet.balance;
        const diff = Number(
          (blockchainBalance! - currentBalance).toFixed(8)
        );

        // Deja synchronise
        if (Math.abs(diff) < 0.00000001) {
          return {
            updated: false,
            total: currentBalance,
            reason: "ALREADY_SYNC",
          };
        }

        // Anti-spam 30 secondes
        const lastTx = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            toWalletId: wallet.id,
            currency: "SDA",
            type: TransactionType.DEPOSIT,
            OR: [
              { description: { contains: "Synchronisation" } },
              { description: { contains: "Depot Sidra Chain" } },
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

        // Mise a jour du solde
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: blockchainBalance! },
        });

        // Log de transaction uniquement si la difference est positive (depot)
        const txReference = `SDA-DEP-${nanoid(10).toUpperCase()}`;
        if (diff > 0) {
          await tx.transaction.create({
            data: {
              reference: txReference,
              amount: Math.abs(diff),
              currency: "SDA",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Depot Sidra Chain (+${diff.toFixed(4)} SDA)`,
              toUserId: userId,
              toWalletId: updatedWallet.id,
              metadata: {
                blockchainBalance: blockchainBalance!,
                previousBalance: currentBalance,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "SIDRA_CHAIN",
              } as Prisma.JsonObject,
            },
          });

          // Notification detaillee pour le depot Sidra (comme les swaps)
          await tx.notification.create({
            data: {
              userId,
              title: "Depot Sidra Chain recu !",
              message: `Vous avez recu ${diff.toFixed(4)} SDA depuis la blockchain Sidra Chain.`,
              type: "SUCCESS",
              read: false,
              metadata: JSON.stringify({
                amount: diff,
                currency: "SDA",
                method: "SIDRA_CHAIN",
                reference: txReference,
                status: "SUCCESS",
                network: "Sidra Chain",
                previousBalance: currentBalance,
                newBalance: blockchainBalance!,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "SIDRA_CHAIN",
              }),
            },
          });
        }

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
      message: result.updated
        ? "Synchronisation reussie"
        : "Solde deja a jour",
    });
  } catch (error: any) {
    console.error("[SIDRA_SYNC_FATAL]:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la synchronisation",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
