export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

const MINE_REWARD = 5;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function getLastMine(userId: string) {
  return prisma.transaction.findFirst({
    where: { toUserId: userId, currency: "PIM", externalId: { startsWith: "MINE-" }, status: TransactionStatus.SUCCESS },
    orderBy: { createdAt: "desc" },
  });
}

function buildStatus(lastMinedAt: Date | null, balance: number, miningCount = 0, referralCount = 0) {
  const now = Date.now();
  const nextMineTime = lastMinedAt ? lastMinedAt.getTime() + COOLDOWN_MS : 0;
  const canMine = !lastMinedAt || now >= nextMineTime;
  const level = Math.max(1, Math.floor(miningCount / 7) + 1);
  return { balance, reward: MINE_REWARD, cooldownMs: COOLDOWN_MS, canMine, lastMinedAt: lastMinedAt?.toISOString() ?? null, nextMineAt: canMine ? null : new Date(nextMineTime).toISOString(), remainingMs: canMine ? 0 : Math.max(0, nextMineTime - now), miningCount, referralCount, level, levelProgress: miningCount % 7 };
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const [wallet, lastMine, miningCount, referralCount] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId_currency: { userId, currency: "PIM" } } }),
      getLastMine(userId),
      prisma.transaction.count({ where: { toUserId: userId, currency: "PIM", externalId: { startsWith: "MINE-" }, status: TransactionStatus.SUCCESS } }),
      prisma.user.count({ where: { referredById: userId } }),
    ]);
    return NextResponse.json(buildStatus(lastMine?.createdAt ?? null, wallet?.balance ?? 0, miningCount, referralCount));
  } catch (error: unknown) {
    console.error("[PIM_MINE_STATUS_ERROR]:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pim-mine:${userId}`}))`;

      const lastMine = await tx.transaction.findFirst({ where: { toUserId: userId, currency: "PIM", externalId: { startsWith: "MINE-" }, status: TransactionStatus.SUCCESS }, orderBy: { createdAt: "desc" } });
      if (lastMine && Date.now() < lastMine.createdAt.getTime() + COOLDOWN_MS) {
        const wallet = await tx.wallet.findUnique({ where: { userId_currency: { userId, currency: "PIM" } } });
        return { blocked: true as const, status: buildStatus(lastMine.createdAt, wallet?.balance ?? 0) };
      }
      const now = new Date();
      const externalId = `MINE-${userId}-${now.getTime()}`;
      const wallet = await tx.wallet.upsert({ where: { userId_currency: { userId, currency: "PIM" } }, update: { balance: { increment: MINE_REWARD } }, create: { userId, currency: "PIM", balance: MINE_REWARD, type: WalletType.CRYPTO } });
      const transaction = await tx.transaction.create({ data: { reference: `MINE-${userId.slice(-6).toUpperCase()}-${now.getTime()}`, externalId, amount: MINE_REWARD, currency: "PIM", type: TransactionType.AIRDROP, status: TransactionStatus.SUCCESS, description: `Minage quotidien : +${MINE_REWARD} PIM`, toUserId: userId, toWalletId: wallet.id, metadata: { source: "mining", reward: MINE_REWARD, adRewarded: true, minedAt: now.toISOString() } } });
      return { wallet, transaction };
    });

    if ("blocked" in result) return NextResponse.json({ error: "Minage indisponible. Revenez plus tard.", ...result.status }, { status: 429 });
    try { await prisma.notification.create({ data: { userId, title: "Minage reussi !", message: `Vous avez mine ${MINE_REWARD} PIM Coins. Revenez dans 24h.`, type: "SUCCESS", metadata: JSON.stringify({ source: "mining", reward: MINE_REWARD }) } }); } catch {}
    return NextResponse.json({ success: true, ...buildStatus(result.transaction.createdAt, result.wallet.balance) });
  } catch (error: unknown) {
    console.error("[PIM_MINE_CLAIM_ERROR]:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erreur lors du minage" }, { status: 500 });
  }
}
