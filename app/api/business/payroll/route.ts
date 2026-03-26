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

    // Get employees with their user accounts (only those linked to platform users)
    const employeesWithUsers = await Promise.all(
      (business.BusinessEmployee as any[]).map(async (emp) => {
        if (!emp.userId) return { ...emp, userAccount: null, userWallet: null };
        
        const userAccount = await prisma.user.findUnique({
          where: { id: emp.userId },
          include: { wallets: true }
        });
        
        const userWallet = userAccount?.wallets.find(w => w.currency === "USD");
        return { ...emp, userAccount, userWallet };
      })
    );

    // Calculate total payment
    const totalAmount = business.BusinessEmployee.reduce((sum, e) => sum + (e.salary || 0), 0);

    if (totalAmount === 0) {
      return NextResponse.json({ error: "Le montant total est de 0$" }, { status: 400 });
    }

    // Get USD wallet of business owner
    const usdWallet = user.wallets.find(w => w.currency === "USD");
    if (!usdWallet || usdWallet.balance < totalAmount) {
      return NextResponse.json({ 
        error: `Solde insuffisant. Requis: $${totalAmount.toFixed(2)}, Disponible: $${(usdWallet?.balance || 0).toFixed(2)}` 
      }, { status: 400 });
    }

    // Generate batch reference for this payroll
    const batchReference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const paymentDate = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct total from business owner wallet
      await tx.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: { decrement: totalAmount } }
      });

      const paidEmployees: { id: string; name: string; amount: number; status: string }[] = [];

      // Process each employee payment
      for (const emp of employeesWithUsers) {
        const salary = emp.salary || 0;
        if (salary <= 0) continue;

        const employeeName = `${emp.firstName} ${emp.lastName}`;

        // If employee has a linked platform account with USD wallet, credit it
        if (emp.userAccount && emp.userWallet) {
          // Credit employee wallet
          await tx.wallet.update({
            where: { id: emp.userWallet.id },
            data: { balance: { increment: salary } }
          });

          // Create transaction for this employee payment
          await tx.transaction.create({
            data: {
              reference: `${batchReference}-${emp.id.slice(-6)}`,
              amount: salary,
              currency: "USD",
              type: "TRANSFER",
              status: "SUCCESS",
              description: `Salaire de ${business.name} - ${paymentDate}`,
              fromUserId: user.id,
              fromWalletId: usdWallet.id,
              toUserId: emp.userAccount.id,
              toWalletId: emp.userWallet.id,
              metadata: {
                type: "SALARY",
                batchReference,
                businessId: business.id,
                businessName: business.name,
                employeeId: emp.id,
                employeeName,
                position: emp.position,
              }
            }
          });

          paidEmployees.push({ id: emp.id, name: employeeName, amount: salary, status: "SUCCESS" });
        } else {
          // Employee not linked to platform - record as pending/manual
          await tx.transaction.create({
            data: {
              reference: `${batchReference}-${emp.id.slice(-6)}`,
              amount: salary,
              currency: "USD",
              type: "TRANSFER",
              status: "PENDING",
              description: `Salaire ${employeeName} (non lie) - ${paymentDate}`,
              fromUserId: user.id,
              fromWalletId: usdWallet.id,
              metadata: {
                type: "SALARY",
                batchReference,
                businessId: business.id,
                businessName: business.name,
                employeeId: emp.id,
                employeeName,
                position: emp.position,
                note: "Employe non lie a un compte plateforme"
              }
            }
          });

          paidEmployees.push({ id: emp.id, name: employeeName, amount: salary, status: "PENDING" });
        }
      }

      return { batchReference, paidEmployees };
    });

    const successCount = result.paidEmployees.filter(e => e.status === "SUCCESS").length;
    const pendingCount = result.paidEmployees.filter(e => e.status === "PENDING").length;

    return NextResponse.json({
      success: true,
      data: {
        reference: result.batchReference,
        amount: totalAmount,
        employeeCount: result.paidEmployees.length,
        successCount,
        pendingCount,
        employees: result.paidEmployees,
        message: pendingCount > 0 
          ? `${successCount} paiement(s) effectue(s), ${pendingCount} en attente (employes non lies)`
          : `${successCount} paiement(s) effectue(s) avec succes`
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_PAYROLL_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
