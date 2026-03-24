export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Only BUSINESS_ADMIN or ADMIN can access
    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Get user's business
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        wallets: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Get business associated with this user's email
    const business = await prisma.business.findFirst({
      where: { email: user.email },
      include: {
        BusinessEmployee: {
          where: { isActive: true }
        },
        BusinessInvoice: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Get USD wallet balance
    const usdWallet = user.wallets.find(w => w.currency === "USD");
    const piWallet = user.wallets.find(w => w.currency === "PI");

    // Get recent transactions for this user
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        fromUser: { select: { name: true, email: true } },
        toUser: { select: { name: true, email: true } }
      }
    });

    // Calculate stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id }
        ],
        createdAt: { gte: thirtyDaysAgo },
        status: "SUCCESS"
      }
    });

    const totalIncoming = monthlyTransactions
      .filter(tx => tx.toUserId === user.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalOutgoing = monthlyTransactions
      .filter(tx => tx.fromUserId === user.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingTransactions = await prisma.transaction.count({
      where: {
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id }
        ],
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        business: business ? {
          id: business.id,
          name: business.name,
          registrationNumber: business.registrationNumber,
          type: business.type,
          status: business.status,
          employeeCount: business.BusinessEmployee.length,
        } : null,
        balances: {
          usd: usdWallet?.balance || 0,
          pi: piWallet?.balance || 0,
        },
        stats: {
          totalIncoming,
          totalOutgoing,
          netFlow: totalIncoming - totalOutgoing,
          pendingTransactions,
          employeeCount: business?.BusinessEmployee.length || 0,
        },
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt,
          isIncoming: tx.toUserId === user.id,
          counterparty: tx.toUserId === user.id 
            ? tx.fromUser?.name || tx.fromUser?.email || "Externe"
            : tx.toUser?.name || tx.toUser?.email || "Externe"
        })),
        employees: business?.BusinessEmployee.map(emp => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          position: emp.position,
          salary: emp.salary,
          isActive: emp.isActive,
        })) || []
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_DASHBOARD_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
