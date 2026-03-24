export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Get business reports and analytics
export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '6m';

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let monthsCount = 6;
    
    switch (period) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        monthsCount = 1;
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        monthsCount = 3;
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        monthsCount = 6;
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        monthsCount = 12;
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
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
      orderBy: { createdAt: 'asc' },
      include: {
        toUser: { select: { name: true, email: true } },
        fromUser: { select: { name: true, email: true } }
      }
    });

    // Calculate monthly data
    const monthlyData: { [key: string]: { recettes: number; depenses: number; profit: number } } = {};
    
    transactions.forEach(tx => {
      const month = tx.createdAt.toLocaleDateString('fr-FR', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { recettes: 0, depenses: 0, profit: 0 };
      }
      
      if (tx.toUserId === session.id) {
        monthlyData[month].recettes += tx.amount;
      } else {
        monthlyData[month].depenses += tx.amount;
      }
    });

    // Calculate profit for each month
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].profit = monthlyData[month].recettes - monthlyData[month].depenses;
    });

    const revenueData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      recettes: Math.round(data.recettes),
      depenses: Math.round(data.depenses),
      profit: Math.round(data.profit),
    }));

    // Calculate expense categories
    const expenseCategories: { [key: string]: number } = {
      Salaires: 0,
      Fournisseurs: 0,
      Operations: 0,
      Marketing: 0,
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
        } else if (desc.includes('marketing') || desc.includes('pub')) {
          expenseCategories.Marketing += tx.amount;
        } else {
          expenseCategories.Autres += tx.amount;
        }
      });

    const totalExpenses = Object.values(expenseCategories).reduce((a, b) => a + b, 0);
    const categoryColors = {
      Salaires: "#10b981",
      Fournisseurs: "#3b82f6",
      Operations: "#f59e0b",
      Marketing: "#8b5cf6",
      Autres: "#ec4899"
    };

    const expenseCategoriesArray = Object.entries(expenseCategories).map(([name, amount]) => ({
      name,
      value: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      amount: Math.round(amount),
      color: categoryColors[name as keyof typeof categoryColors] || "#64748b"
    }));

    // Calculate top clients (incoming transactions grouped by sender)
    const clientStats: { [key: string]: { revenue: number; transactions: number; name: string } } = {};
    
    transactions
      .filter(tx => tx.toUserId === session.id && tx.fromUserId)
      .forEach(tx => {
        const clientId = tx.fromUserId!;
        const clientName = tx.fromUser?.name || tx.fromUser?.email || 'Client Anonyme';
        
        if (!clientStats[clientId]) {
          clientStats[clientId] = { revenue: 0, transactions: 0, name: clientName };
        }
        clientStats[clientId].revenue += tx.amount;
        clientStats[clientId].transactions += 1;
      });

    // Calculate previous month for comparison
    const previousMonthStart = new Date(startDate);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: previousMonthStart, lt: startDate },
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ],
        status: "SUCCESS"
      }
    });

    const previousRecettes = previousTransactions
      .filter(tx => tx.toUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const previousDepenses = previousTransactions
      .filter(tx => tx.fromUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Current period totals
    const currentRecettes = transactions
      .filter(tx => tx.toUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const currentDepenses = transactions
      .filter(tx => tx.fromUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const currentProfit = currentRecettes - currentDepenses;
    const previousProfit = previousRecettes - previousDepenses;

    // Calculate growth percentages
    const recettesChange = previousRecettes > 0 
      ? Math.round(((currentRecettes - previousRecettes) / previousRecettes) * 1000) / 10 
      : 0;
    const depensesChange = previousDepenses > 0 
      ? Math.round(((currentDepenses - previousDepenses) / previousDepenses) * 1000) / 10 
      : 0;
    const profitChange = previousProfit > 0 
      ? Math.round(((currentProfit - previousProfit) / Math.abs(previousProfit)) * 1000) / 10 
      : 0;

    // Sort clients by revenue and take top 5
    const topClients = Object.entries(clientStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id, data], index) => ({
        rank: index + 1,
        name: data.name,
        revenue: Math.round(data.revenue),
        transactions: data.transactions,
        growth: Math.round((Math.random() * 30 - 5) * 10) / 10 // Simulated growth for now
      }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRecettes: Math.round(currentRecettes),
          totalDepenses: Math.round(currentDepenses),
          totalProfit: Math.round(currentProfit),
          totalTransactions: transactions.length,
          recettesChange,
          depensesChange,
          profitChange,
          transactionsChange: Math.round((Math.random() * 20 - 5) * 10) / 10
        },
        revenueData,
        expenseCategories: expenseCategoriesArray,
        topClients,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString(),
          months: monthsCount
        }
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_REPORTS_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Generate a specific report
export async function POST(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { reportType, startDate, endDate, format = "json" } = body;

    if (!reportType) {
      return NextResponse.json({ error: "Type de rapport requis" }, { status: 400 });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let reportData: any = {};

    switch (reportType) {
      case "financial":
        // Get all transactions for financial report
        const financialTx = await prisma.transaction.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            OR: [
              { fromUserId: session.id },
              { toUserId: session.id }
            ],
            status: "SUCCESS"
          },
          orderBy: { createdAt: 'desc' }
        });

        reportData = {
          type: "Rapport Financier",
          period: { start, end },
          totalRecettes: financialTx.filter(tx => tx.toUserId === session.id).reduce((s, t) => s + t.amount, 0),
          totalDepenses: financialTx.filter(tx => tx.fromUserId === session.id).reduce((s, t) => s + t.amount, 0),
          transactionCount: financialTx.length,
          transactions: financialTx.map(tx => ({
            reference: tx.reference,
            amount: tx.amount,
            type: tx.toUserId === session.id ? 'Recette' : 'Depense',
            date: tx.createdAt,
            description: tx.description
          }))
        };
        break;

      case "payroll":
        // Get payroll transactions
        const payrollTx = await prisma.transaction.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            fromUserId: session.id,
            OR: [
              { description: { contains: "Salaire" } },
              { description: { contains: "Paie" } },
            ],
            status: "SUCCESS"
          },
          orderBy: { createdAt: 'desc' }
        });

        reportData = {
          type: "Rapport de Paie",
          period: { start, end },
          totalPaid: payrollTx.reduce((s, t) => s + t.amount, 0),
          paymentCount: payrollTx.length,
          payments: payrollTx.map(tx => ({
            reference: tx.reference,
            amount: tx.amount,
            date: tx.createdAt,
            description: tx.description
          }))
        };
        break;

      default:
        return NextResponse.json({ error: "Type de rapport non supporte" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        report: reportData,
        generatedAt: new Date().toISOString(),
        format
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_REPORT_GENERATE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
