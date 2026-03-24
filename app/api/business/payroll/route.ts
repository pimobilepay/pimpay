export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Get payroll info and history
export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    const business = await prisma.business.findFirst({
      where: { email: user?.email },
      include: {
        BusinessEmployee: {
          where: { isActive: true }
        }
      }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Get payroll transactions (type TRANSFER with description containing "Salaire" or "Paie")
    const payrollTransactions = await prisma.transaction.findMany({
      where: {
        fromUserId: session.id,
        OR: [
          { description: { contains: "Salaire" } },
          { description: { contains: "Paie" } },
          { description: { contains: "salaire" } },
          { description: { contains: "paie" } },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Calculate stats
    const totalSalary = business.BusinessEmployee.reduce((sum, e) => sum + (e.salary || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        employees: business.BusinessEmployee.map(emp => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          position: emp.position,
          salary: emp.salary,
          isActive: emp.isActive,
        })),
        payrollHistory: payrollTransactions.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt,
        })),
        stats: {
          totalEmployees: business.BusinessEmployee.length,
          totalMonthlySalary: totalSalary,
        }
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_PAYROLL_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Process payroll payment
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
    const { employeeIds, description } = body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "Selectionnez au moins un employe" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallets: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    const business = await prisma.business.findFirst({
      where: { email: user.email },
      include: {
        BusinessEmployee: {
          where: { 
            id: { in: employeeIds },
            isActive: true 
          }
        }
      }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Calculate total payment
    const totalAmount = business.BusinessEmployee.reduce((sum, e) => sum + (e.salary || 0), 0);

    // Get USD wallet
    const usdWallet = user.wallets.find(w => w.currency === "USD");
    if (!usdWallet || usdWallet.balance < totalAmount) {
      return NextResponse.json({ 
        error: `Solde insuffisant. Requis: $${totalAmount}, Disponible: $${usdWallet?.balance || 0}` 
      }, { status: 400 });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: { decrement: totalAmount } }
      });

      // Create payroll transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          amount: totalAmount,
          currency: "USD",
          type: "TRANSFER",
          status: "SUCCESS",
          description: description || `Paiement salaires - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          fromUserId: user.id,
          fromWalletId: usdWallet.id,
          metadata: {
            type: "PAYROLL",
            employeeCount: business.BusinessEmployee.length,
            employees: business.BusinessEmployee.map(e => ({
              id: e.id,
              name: `${e.firstName} ${e.lastName}`,
              amount: e.salary
            }))
          }
        }
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.id,
        reference: result.reference,
        amount: totalAmount,
        employeeCount: business.BusinessEmployee.length,
        status: result.status,
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_PAYROLL_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
