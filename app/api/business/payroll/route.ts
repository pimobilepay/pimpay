export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";

// GET - Get payroll info and history
export async function GET(req: NextRequest) {
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
export async function POST(req: NextRequest) {
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

    // Get employees with their user accounts (try multiple ways to find their PimPay account)
    const employeesWithUsers = await Promise.all(
      (business.BusinessEmployee as any[]).map(async (emp) => {
        let userAccount = null;
        let userWallet = null;

        // 1. First try by direct userId link
        if (emp.userId) {
          userAccount = await prisma.user.findUnique({
            where: { id: emp.userId },
            include: { wallets: true }
          });
        }

        // 2. If no userId or user not found, try by email
        if (!userAccount && emp.email) {
          userAccount = await prisma.user.findFirst({
            where: { 
              OR: [
                { email: emp.email },
                { email: emp.email.toLowerCase() }
              ]
            },
            include: { wallets: true }
          });
          
          // If found by email, update the employee record with the userId for future payments
          if (userAccount) {
            await prisma.businessEmployee.update({
              where: { id: emp.id },
              data: { userId: userAccount.id }
            });
          }
        }

        // 3. If still not found, try by phone number
        if (!userAccount && emp.phone) {
          const cleanPhone = emp.phone.replace(/\D/g, '');
          userAccount = await prisma.user.findFirst({
            where: { 
              OR: [
                { phone: emp.phone },
                { phone: cleanPhone },
                { phone: { contains: cleanPhone.slice(-9) } }
              ]
            },
            include: { wallets: true }
          });
          
          // If found by phone, update the employee record with the userId
          if (userAccount) {
            await prisma.businessEmployee.update({
              where: { id: emp.id },
              data: { userId: userAccount.id }
            });
          }
        }

        // 4. Try by name matching as a last resort (first + last name)
        if (!userAccount) {
          const fullName = `${emp.firstName} ${emp.lastName}`.trim();
          userAccount = await prisma.user.findFirst({
            where: { 
              name: { equals: fullName, mode: 'insensitive' }
            },
            include: { wallets: true }
          });
          
          // If found by name, update the employee record
          if (userAccount) {
            await prisma.businessEmployee.update({
              where: { id: emp.id },
              data: { userId: userAccount.id }
            });
          }
        }

        if (userAccount) {
          userWallet = userAccount.wallets.find((w: { currency: string }) => w.currency === "USD");
        }

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

      const paidEmployees: { id: string; name: string; amount: number; status: string; recipientId: string | null }[] = [];

      // Process each employee payment
      for (const emp of employeesWithUsers) {
        const salary = emp.salary || 0;
        if (salary <= 0) continue;

        const employeeName = `${emp.firstName} ${emp.lastName}`;

        // If employee has a linked platform account, credit their wallet
        if (emp.userAccount) {
          let employeeWallet = emp.userWallet;

          // If user exists but doesn't have a USD wallet, create one
          if (!employeeWallet) {
            employeeWallet = await tx.wallet.create({
              data: {
                userId: emp.userAccount.id,
                currency: "USD",
                balance: 0,
              }
            });
          }

          // Credit employee wallet
          await tx.wallet.update({
            where: { id: employeeWallet.id },
            data: { balance: { increment: salary } }
          });

          const txReference = `${batchReference}-${emp.id.slice(-6)}`;

          // Create transaction for this employee payment
          await tx.transaction.create({
            data: {
              reference: txReference,
              amount: salary,
              currency: "USD",
              type: "TRANSFER",
              status: "SUCCESS",
              description: `Salaire de ${business.name} - ${paymentDate}`,
              fromUserId: user.id,
              fromWalletId: usdWallet.id,
              toUserId: emp.userAccount.id,
              toWalletId: employeeWallet.id,
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

          // Create notification for the employee receiving salary
          await tx.notification.create({
            data: {
              userId: emp.userAccount.id,
              title: "Salaire recu !",
              message: `Vous avez recu votre salaire de ${salary.toLocaleString()} USD de ${business.name}.`,
              type: "PAYMENT_RECEIVED",
              metadata: {
                amount: salary,
                currency: "USD",
                senderName: business.name,
                businessId: business.id,
                reference: txReference,
                position: emp.position,
                paymentDate,
                status: "SUCCESS",
              }
            }
          });

          paidEmployees.push({ id: emp.id, name: employeeName, amount: salary, status: "SUCCESS", recipientId: emp.userAccount.id });
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

          paidEmployees.push({ id: emp.id, name: employeeName, amount: salary, status: "PENDING", recipientId: null });
        }
      }

      return { batchReference, paidEmployees };
    });

    const successCount = result.paidEmployees.filter(e => e.status === "SUCCESS").length;
    const pendingCount = result.paidEmployees.filter(e => e.status === "PENDING").length;

    // Create notification for the business owner (sender)
    await sendNotification({
      userId: user.id,
      title: "Paiement salaires effectue !",
      message: `Vous avez paye ${successCount} employe(s) pour un total de ${totalAmount.toLocaleString()} USD.${pendingCount > 0 ? ` ${pendingCount} paiement(s) en attente.` : ""}`,
      type: "PAYMENT_SENT",
      metadata: {
        type: "SALARY_BATCH",
        amount: totalAmount,
        currency: "USD",
        reference: result.batchReference,
        employeeCount: result.paidEmployees.length,
        successCount,
        pendingCount,
        employees: result.paidEmployees.map(e => ({ name: e.name, amount: e.amount, status: e.status })),
        status: "SUCCESS",
      }
    });

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
