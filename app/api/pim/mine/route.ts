export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

// Recompense de minage fixe par session
const MINE_REWARD = 5;
// Delai entre deux sessions de minage : 24h
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Recupere la derniere session de minage de l'utilisateur.
 * On identifie les sessions de minage par un externalId prefixe "MINE-".
 */
async function getLastMine(userId: string) {
  return prisma.transaction.findFirst({
    where: {
      toUserId: userId,
      currency: "PIM",
      externalId: { startsWith: "MINE-" },
      status: TransactionStatus.SUCCESS,
    },
    orderBy: { createdAt: "desc" },
  });
}

function buildStatus(lastMinedAt: Date | null, balance: number) {
  const now = Date.now();
  const nextMineTime = lastMinedAt ? lastMinedAt.getTime() + COOLDOWN_MS : 0;
  const canMine = !lastMinedAt || now >= nextMineTime;
  return {
    balance,
    reward: MINE_REWARD,
    cooldownMs: COOLDOWN_MS,
    canMine,
    lastMinedAt: lastMinedAt ? lastMinedAt.toISOString() : null,
    nextMineAt: canMine ? null : new Date(nextMineTime).toISOString(),
    remainingMs: canMine ? 0 : Math.max(0, nextMineTime - now),
  };
}

/**
 * GET /api/pim/mine
 * Retourne l'etat de minage : solde PIM, disponibilite, temps restant.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const [wallet, lastMine] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PIM" } },
      }),
      getLastMine(userId),
    ]);

    return NextResponse.json(buildStatus(lastMine?.createdAt ?? null, wallet?.balance ?? 0));
  } catch (error: any) {
    console.error("[PIM_MINE_STATUS_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/pim/mine
 * Reclame la recompense de minage si le cooldown de 24h est ecoule.
 */
export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verification anti-triche cote serveur : le cooldown est calcule a
    // partir de la derniere session de minage enregistree en base.
    const lastMine = await getLastMine(userId);
    if (lastMine) {
      const nextMineTime = lastMine.createdAt.getTime() + COOLDOWN_MS;
      if (Date.now() < nextMineTime) {
        const wallet = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: "PIM" } },
        });
        return NextResponse.json(
          {
            error: "Minage indisponible. Revenez plus tard.",
            ...buildStatus(lastMine.createdAt, wallet?.balance ?? 0),
          },
          { status: 429 }
        );
      }
    }

    const now = new Date();
    const reference = `MINE-${userId.slice(-6).toUpperCase()}-${now.getTime()}`;
    const externalId = `MINE-${userId}-${now.getTime()}`;

    const result = await prisma.$transaction(async (tx) => {
      const pimWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PIM" } },
        update: { balance: { increment: MINE_REWARD } },
        create: {
          userId,
          currency: "PIM",
          balance: MINE_REWARD,
          type: WalletType.CRYPTO,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference,
          externalId,
          amount: MINE_REWARD,
          currency: "PIM",
          type: TransactionType.AIRDROP,
          status: TransactionStatus.SUCCESS,
          description: `Minage quotidien : +${MINE_REWARD} PIM`,
          toUserId: userId,
          toWalletId: pimWallet.id,
          metadata: {
            source: "mining",
            reward: MINE_REWARD,
            minedAt: now.toISOString(),
          },
        },
      });

      return { pimWallet, transaction };
    });

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "Minage reussi !",
          message: `Vous avez mine ${MINE_REWARD} PIM Coins. Revenez dans 24h.`,
          type: "SUCCESS",
          metadata: JSON.stringify({ source: "mining", reward: MINE_REWARD }),
        },
      });
    } catch {
      // Notification non-bloquante
    }

    return NextResponse.json({
      success: true,
      ...buildStatus(now, result.pimWallet.balance),
    });
  } catch (error: any) {
    console.error("[PIM_MINE_CLAIM_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur lors du minage" }, { status: 500 });
  }
}
