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

    // Get the days parameter from query string (default to 7)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const validDays = [7, 30, 90].includes(days) ? days : 7;

    // Get transactions from the last N days grouped by type and day
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ["SUCCESS", "SUCCESS"] },
      },
      select: {
        amount: true,
        type: true,
        status: true,
        statusClass: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by day - use date format for display
    const chartMap: Record<string, { day: string; date: string; entrant: number; sortant: number; exchange: number; mpay: number; total: number }> = {};

    // Initialize last N days
    for (let i = validDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      // Format date as DD/MM for display
      const dayStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      chartMap[key] = {
        day: dayStr,
        date: key,
        entrant: 0,
        sortant: 0,
        exchange: 0,
        mpay: 0,
        total: 0,
      };
    }

    // Helper to check if transaction is MPAY external transfer
    const isMpayTransaction = (tx: { statusClass?: string | null; metadata?: unknown }): boolean => {
      // Check statusClass for BROADCASTED (MPAY external transfers)
      if (tx.statusClass === "BROADCASTED") return true;
      
      // Check metadata for pimpayRef (MPAY transactions)
      if (tx.metadata && typeof tx.metadata === "object") {
        const meta = tx.metadata as Record<string, unknown>;
        if (meta.pimpayRef || meta.piPaymentId || meta.blockchainTxHash) return true;
      }
      
      return false;
    };

    // Aggregate transactions
    let mpayCount = 0;
    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split("T")[0];
      if (!chartMap[key]) continue;

      const amount = Math.abs(tx.amount);
      
      // Check if this is an MPAY transaction
      if (isMpayTransaction(tx)) {
        chartMap[key].mpay += amount;
        mpayCount++;
      } else if (tx.type === "DEPOSIT" || tx.type === "AIRDROP" || tx.type === "STAKING_REWARD") {
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
      mpay: Math.round(d.mpay * 100) / 100,
      total: Math.round(d.total * 100) / 100,
    }));

    // Summary stats
    const totalEntrant = chartData.reduce((acc, d) => acc + d.entrant, 0);
    const totalSortant = chartData.reduce((acc, d) => acc + d.sortant, 0);
    const totalExchange = chartData.reduce((acc, d) => acc + d.exchange, 0);
    const totalMpay = chartData.reduce((acc, d) => acc + d.mpay, 0);

    return NextResponse.json({
      chartData,
      summary: {
        totalEntrant: Math.round(totalEntrant * 100) / 100,
        totalSortant: Math.round(totalSortant * 100) / 100,
        totalExchange: Math.round(totalExchange * 100) / 100,
        totalMpay: Math.round(totalMpay * 100) / 100,
        totalVolume: Math.round((totalEntrant + totalSortant + totalExchange + totalMpay) * 100) / 100,
        transactionCount: transactions.length,
        mpayCount,
      },
    });
  } catch (error: unknown) {
    console.error("CHART_DATA_ERROR:", error);
    // Return fallback empty data
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const validDays = [7, 30, 90].includes(days) ? days : 7;
    
    const fallback = [];
    for (let i = validDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      fallback.push({
        day: dayStr,
        date: date.toISOString().split("T")[0],
        entrant: 0,
        sortant: 0,
        exchange: 0,
        mpay: 0,
        total: 0,
      });
    }
    return NextResponse.json({
      chartData: fallback,
      summary: { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalMpay: 0, totalVolume: 0, transactionCount: 0, mpayCount: 0 },
    });
  }
}
