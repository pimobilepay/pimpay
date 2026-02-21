export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Get transactions from the last 7 days grouped by type and day
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        amount: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by day
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const chartMap: Record<string, { day: string; entrant: number; sortant: number; exchange: number; total: number }> = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      chartMap[key] = {
        day: dayNames[date.getDay()],
        entrant: 0,
        sortant: 0,
        exchange: 0,
        total: 0,
      };
    }

    // Aggregate transactions
    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split("T")[0];
      if (!chartMap[key]) continue;

      const amount = Math.abs(tx.amount);

      if (tx.type === "DEPOSIT" || tx.type === "AIRDROP" || tx.type === "STAKING_REWARD") {
        chartMap[key].entrant += amount;
      } else if (tx.type === "WITHDRAW" || tx.type === "PAYMENT" || tx.type === "CARD_PURCHASE") {
        chartMap[key].sortant += amount;
      } else if (tx.type === "EXCHANGE") {
        chartMap[key].exchange += amount;
      } else if (tx.type === "TRANSFER") {
        // TRANSFER counted as both entrant (for recipient) and sortant (for sender)
        // At the admin level, we count it as sortant volume since it's moving money
        chartMap[key].sortant += amount;
        chartMap[key].entrant += amount;
      }

      chartMap[key].total += amount;
    }

    const chartData = Object.values(chartMap).map((d) => ({
      ...d,
      entrant: Math.round(d.entrant * 100) / 100,
      sortant: Math.round(d.sortant * 100) / 100,
      exchange: Math.round(d.exchange * 100) / 100,
      total: Math.round(d.total * 100) / 100,
    }));

    // Summary stats
    const totalEntrant = chartData.reduce((acc, d) => acc + d.entrant, 0);
    const totalSortant = chartData.reduce((acc, d) => acc + d.sortant, 0);
    const totalExchange = chartData.reduce((acc, d) => acc + d.exchange, 0);

    return NextResponse.json({
      chartData,
      summary: {
        totalEntrant: Math.round(totalEntrant * 100) / 100,
        totalSortant: Math.round(totalSortant * 100) / 100,
        totalExchange: Math.round(totalExchange * 100) / 100,
        totalVolume: Math.round((totalEntrant + totalSortant + totalExchange) * 100) / 100,
        transactionCount: transactions.length,
      },
    });
  } catch (error: any) {
    console.error("CHART_DATA_ERROR:", error);
    // Return fallback empty data
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const fallback = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      fallback.push({
        day: dayNames[date.getDay()],
        entrant: 0,
        sortant: 0,
        exchange: 0,
        total: 0,
      });
    }
    return NextResponse.json({
      chartData: fallback,
      summary: { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalVolume: 0, transactionCount: 0 },
    });
  }
}
