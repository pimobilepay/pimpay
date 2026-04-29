export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Get treasury overview and cash flow data
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallets: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get all transactions in period
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ],
        status: "SUCCESS"
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate daily cash flow
    const cashFlowByDay: { [key: string]: { entrant: number; sortant: number } } = {};
    
    // Pre-fill all days in the period with zero values for continuous chart line
    const dayCount = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cashFlowByDay[key] = { entrant: 0, sortant: 0 };
    }
    
    // Add transaction amounts to their respective days
    transactions.forEach(tx => {
      const day = tx.createdAt.toISOString().split('T')[0];
      if (!cashFlowByDay[day]) {
        cashFlowByDay[day] = { entrant: 0, sortant: 0 };
      }
      
      if (tx.toUserId === session.id) {
        cashFlowByDay[day].entrant += tx.amount;
      } else {
        cashFlowByDay[day].sortant += tx.amount;
      }
    });

    // Convert to array for chart, sorted chronologically
    const cashFlowData = Object.entries(cashFlowByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({
        day: new Date(day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        entrant: Math.round(data.entrant * 100) / 100,
        sortant: Math.round(data.sortant * 100) / 100,
      }));

    // Calculate totals
    const totalEntrant = transactions
      .filter(tx => tx.toUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSortant = transactions
      .filter(tx => tx.fromUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate expense categories
    const expenseCategories: { [key: string]: number } = {
      Salaires: 0,
      Fournisseurs: 0,
      Operations: 0,
      Autres: 0
    };

    transactions
      .filter(tx => tx.fromUserId === session.id)
      .forEach(tx => {
        const desc = tx.description?.toLowerCase() || '';
        if (desc.includes('salaire') || desc.includes('paie')) {
          expenseCategories.Salaires += tx.amount;
        } else if (desc.includes('fournisseur') || desc.includes('facture')) {
          expenseCategories.Fournisseurs += tx.amount;
        } else if (desc.includes('loyer') || desc.includes('abonnement') || desc.includes('assurance')) {
          expenseCategories.Operations += tx.amount;
        } else {
          expenseCategories.Autres += tx.amount;
        }
      });

    const totalExpenses = Object.values(expenseCategories).reduce((a, b) => a + b, 0);
    const expenseCategoriesArray = Object.entries(expenseCategories).map(([name, value]) => ({
      name,
      value: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
      amount: Math.round(value * 100) / 100
    }));

    // Get recent movements
    const recentMovements = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ],
        status: "SUCCESS"
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get wallet balances
    const accounts = user.wallets.map(w => ({
      id: w.id,
      name: w.currency === "USD" ? "Compte Principal USD" : 
            w.currency === "PI" ? "Compte Pi Network" : `Compte ${w.currency}`,
      balance: w.balance,
      currency: w.currency,
      type: w.type,
    }));

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        totals: {
          totalBalance: user.wallets.reduce((sum, w) => w.currency === "USD" ? sum + w.balance : sum, 0),
          totalEntrant: Math.round(totalEntrant * 100) / 100,
          totalSortant: Math.round(totalSortant * 100) / 100,
          netFlow: Math.round((totalEntrant - totalSortant) * 100) / 100,
        },
        cashFlowData,
        expenseCategories: expenseCategoriesArray,
        recentMovements: recentMovements.map(tx => ({
          id: tx.id,
          description: tx.description || tx.type,
          amount: tx.amount,
          type: tx.toUserId === session.id ? 'entrant' : 'sortant',
          date: tx.createdAt.toLocaleDateString('fr-FR'),
          time: tx.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }))
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_TREASURY_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
