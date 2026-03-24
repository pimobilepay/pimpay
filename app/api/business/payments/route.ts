export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Get payment info and recent payments
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
      include: { wallets: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Get recent outgoing payments
    const recentPayments = await prisma.transaction.findMany({
      where: {
        fromUserId: session.id,
        type: { in: ["TRANSFER", "PAYMENT", "WITHDRAW"] }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        toUser: { select: { name: true, email: true } }
      }
    });

    // Get frequent recipients (based on transaction history)
    const frequentRecipients = await prisma.transaction.groupBy({
      by: ['toUserId'],
      where: {
        fromUserId: session.id,
        toUserId: { not: null },
        status: "SUCCESS"
      },
      _count: true,
      orderBy: { _count: { toUserId: 'desc' } },
      take: 5
    });

    // Get recipient details
    const recipientIds = frequentRecipients.map(r => r.toUserId).filter(Boolean) as string[];
    const recipientDetails = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, name: true, email: true }
    });

    const usdWallet = user.wallets.find(w => w.currency === "USD");
    const piWallet = user.wallets.find(w => w.currency === "PI");

    return NextResponse.json({
      success: true,
      data: {
        balance: {
          usd: usdWallet?.balance || 0,
          pi: piWallet?.balance || 0,
        },
        recentPayments: recentPayments.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          recipient: tx.toUser?.name || tx.toUser?.email || tx.accountName || "Externe",
          createdAt: tx.createdAt,
        })),
        frequentRecipients: frequentRecipients.map(r => {
          const details = recipientDetails.find(d => d.id === r.toUserId);
          return {
            userId: r.toUserId,
            name: details?.name || details?.email || "Utilisateur",
            transactionCount: r._count,
          };
        })
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_PAYMENTS_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new payment
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
    const { amount, currency = "USD", recipient, recipientType, description, method } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (!recipient) {
      return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallets: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Get appropriate wallet
    const wallet = user.wallets.find(w => w.currency === currency);
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ 
        error: `Solde ${currency} insuffisant. Disponible: ${wallet?.balance || 0}` 
      }, { status: 400 });
    }

    // Find recipient user (by email, phone, or username)
    let recipientUser = null;
    if (recipientType === "internal") {
      recipientUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: recipient.toLowerCase() },
            { phone: recipient },
            { username: recipient.toLowerCase() }
          ]
        },
        include: { wallets: true }
      });
    }

    // Process payment
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from sender wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } }
      });

      let toWalletId = null;
      let toUserId = null;

      // If internal transfer, credit recipient
      if (recipientUser) {
        toUserId = recipientUser.id;
        const recipientWallet = recipientUser.wallets.find(w => w.currency === currency);
        if (recipientWallet) {
          toWalletId = recipientWallet.id;
          await tx.wallet.update({
            where: { id: recipientWallet.id },
            data: { balance: { increment: amount } }
          });
        }
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          reference: `BIZ-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          amount,
          currency,
          type: recipientUser ? "TRANSFER" : "PAYMENT",
          status: "SUCCESS",
          description: description || `Paiement business vers ${recipient}`,
          fromUserId: user.id,
          fromWalletId: wallet.id,
          toUserId,
          toWalletId,
          metadata: {
            method,
            recipientType,
            recipientInfo: recipient,
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
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_PAYMENTS_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
