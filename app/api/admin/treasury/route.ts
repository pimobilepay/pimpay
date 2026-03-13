export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // 1. Get all wallets grouped by currency
    const wallets = await prisma.wallet.groupBy({
      by: ['currency'],
      _sum: { balance: true },
      _count: { id: true },
    });

    // 2. Get total transactions volume by currency
    const transactions = await prisma.transaction.groupBy({
      by: ['currency'],
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 3. Get pending transactions
    const pendingTransactions = await prisma.transaction.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        amount: true,
        currency: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 4. Get recent large transactions (> 1000 units)
    const largeTransactions = await prisma.transaction.findMany({
      where: { 
        status: 'SUCCESS',
        amount: { gte: 1000 },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        type: true,
        createdAt: true,
        fromUser: { select: { username: true, email: true } },
        toUser: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // 5. Get transaction stats by type
    const transactionsByType = await prisma.transaction.groupBy({
      by: ['type'],
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 6. Get daily volume for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        amount: true,
        currency: true,
        type: true,
        createdAt: true,
      },
    });

    // Group by day
    const dailyVolume: Record<string, { deposits: number; withdrawals: number; transfers: number }> = {};
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = days[date.getDay()];
      dailyVolume[dayKey] = { deposits: 0, withdrawals: 0, transfers: 0 };
    }

    recentTransactions.forEach((tx) => {
      const dayKey = days[new Date(tx.createdAt).getDay()];
      if (dailyVolume[dayKey]) {
        if (tx.type === 'DEPOSIT') {
          dailyVolume[dayKey].deposits += tx.amount;
        } else if (tx.type === 'WITHDRAW') {
          dailyVolume[dayKey].withdrawals += tx.amount;
        } else if (tx.type === 'TRANSFER') {
          dailyVolume[dayKey].transfers += tx.amount;
        }
      }
    });

    const chartData = Object.entries(dailyVolume).map(([day, data]) => ({
      day,
      deposits: Math.round(data.deposits),
      withdrawals: Math.round(data.withdrawals),
      transfers: Math.round(data.transfers),
    }));

    // 7. Calculate totals
    const totalBalance = wallets.reduce((sum, w) => sum + (w._sum.balance || 0), 0);
    const totalTransactionVolume = transactions.reduce((sum, t) => sum + (t._sum.amount || 0), 0);
    const pendingVolume = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 8. Get currency breakdown for pie chart
    const currencyBreakdown = wallets.map((w) => ({
      currency: w.currency,
      balance: w._sum.balance || 0,
      accounts: w._count.id,
    }));

    return NextResponse.json({
      summary: {
        totalBalance,
        totalTransactionVolume,
        pendingVolume,
        pendingCount: pendingTransactions.length,
        totalWallets: wallets.reduce((sum, w) => sum + w._count.id, 0),
      },
      currencyBreakdown,
      transactionsByType: transactionsByType.map((t) => ({
        type: t.type,
        volume: t._sum.amount || 0,
        count: t._count.id,
      })),
      chartData,
      pendingTransactions,
      largeTransactions,
    });
  } catch (error: any) {
    console.error("TREASURY_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
