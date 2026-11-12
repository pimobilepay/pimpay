export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { approvePiPayment, getPiNetwork, getPiPayment } from "@/lib/pi";
import { resolvePimCoins } from "@/lib/pim-packages";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });

    let body: {
      paymentId?: string;
      amount?: number | string;
      memo?: string;
      txid?: string;
      toAddress?: string;
      currency?: string;
      type?: string;
      metadata?: { productId?: string };
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const requestedAmount = Number(body.amount);
    if (!paymentId || paymentId.length > 256 || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: "paymentId ou montant invalide" }, { status: 400 });
    }

    const [payment, user, network] = await Promise.all([
      getPiPayment(paymentId),
      prisma.user.findUnique({ where: { id: userId }, select: { piUserId: true } }),
      getPiNetwork(),
    ]);
    if (!payment || payment.identifier !== paymentId) {
      return NextResponse.json({ error: "Paiement Pi introuvable" }, { status: 404 });
    }
    if (payment.metadata?.network && payment.metadata.network !== network) {
      return NextResponse.json({ error: "Le paiement Pi appartient à un autre réseau" }, { status: 409 });
    }

    const isPaymentOwner = Boolean(
    payment.user_uid && user?.piUserId && payment.user_uid === user.piUserId
  );
    if (!isPaymentOwner) {
      return NextResponse.json({ error: "Le paiement Pi n'appartient pas à cet utilisateur" }, { status: 403 });
    }

    const piAmount = Number(payment.amount);
    if (!Number.isFinite(piAmount) || piAmount <= 0 || Math.abs(piAmount - requestedAmount) > 1e-7) {
      return NextResponse.json({ error: "Le montant demandé ne correspond pas au paiement Pi" }, { status: 409 });
    }

    const isWithdraw = Boolean(body.toAddress) && body.currency === "PI";
    const isPimPurchase = body.type === "PIM_COIN_PURCHASE";
    if (isWithdraw && !/^G[A-Z2-7]{55}$/.test(body.toAddress || "")) {
      return NextResponse.json({ error: "Adresse de destination Pi invalide" }, { status: 400 });
    }

    if (isPimPurchase) {
      const productId = body.metadata?.productId;
      if (typeof productId !== "string" || !productId) {
        return NextResponse.json({ error: "productId requis pour cet achat PIM" }, { status: 400 });
      }
      const resolved = resolvePimCoins(productId, piAmount);
      if (!resolved.ok) return NextResponse.json({ error: resolved.reason || "Produit PIM invalide" }, { status: 400 });

      const externalId = `PIM-${paymentId}`;
      const existing = await prisma.transaction.findUnique({ where: { externalId } });
      if (existing && existing.toUserId !== userId) {
        return NextResponse.json({ error: "Cette transaction est associée à un autre utilisateur" }, { status: 403 });
      }
      if (existing?.status === TransactionStatus.SUCCESS) {
        return NextResponse.json({ success: true, type: "PIM_COIN_PURCHASE", alreadyApproved: true });
      }

      const approved = await approvePiPayment(paymentId);
      if (!approved) return NextResponse.json({ error: "Pi Network refuse l'approbation" }, { status: 403 });

      await prisma.transaction.upsert({
        where: { externalId },
        update: {
          amount: resolved.pimCoins,
          toUserId: userId,
          metadata: {
            type: "PIM_COIN_PURCHASE",
            piPaymentId: paymentId,
            piAmount,
            pimCoins: resolved.pimCoins,
            productId,
            network,
            approvedAt: new Date().toISOString(),
          },
        },
        create: {
          reference: `PIM-${paymentId.slice(-8).toUpperCase()}`,
          externalId,
          blockchainTx: body.txid || null,
          amount: resolved.pimCoins,
          currency: "PIM",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          description: `Achat de ${resolved.pimCoins} PIM Coins`,
          toUserId: userId,
          metadata: {
            type: "PIM_COIN_PURCHASE",
            piPaymentId: paymentId,
            piAmount,
            pimCoins: resolved.pimCoins,
            productId,
            network,
            approvedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({ success: true, type: "PIM_COIN_PURCHASE", network });
    }

    const existingPayment = await prisma.transaction.findUnique({ where: { externalId: paymentId } });
    if (existingPayment && existingPayment.toUserId && existingPayment.toUserId !== userId) {
      return NextResponse.json({ error: "Cette transaction est associée à un autre utilisateur" }, { status: 403 });
    }

    const approved = await approvePiPayment(paymentId);
    if (!approved) return NextResponse.json({ error: "Pi Network refuse l'approbation" }, { status: 403 });

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: {},
        create: { userId, currency: "PI", balance: 0, type: WalletType.PI },
      });

      if (isWithdraw) {
        if (wallet.balance < piAmount) throw new Error("Solde PI insuffisant");
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: piAmount } } });

        const transaction = await tx.transaction.upsert({
          where: { externalId: paymentId },
          update: {
            amount: piAmount,
            fromUserId: userId,
            fromWalletId: wallet.id,
            status: TransactionStatus.PENDING,
            metadata: { toAddress: body.toAddress, network, approvedAt: new Date().toISOString() },
          },
          create: {
            reference: `WD-PI-${paymentId.slice(-8).toUpperCase()}`,
            externalId: paymentId,
            blockchainTx: body.txid || null,
            amount: piAmount,
            currency: "PI",
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.PENDING,
            description: `Envoi Pi vers ${body.toAddress!.slice(0, 8)}...${body.toAddress!.slice(-4)}`,
            fromUserId: userId,
            fromWalletId: wallet.id,
            metadata: { toAddress: body.toAddress, network, approvedAt: new Date().toISOString() },
          },
        });
        return { transaction, isWithdraw: true };
      }

      const transaction = await tx.transaction.findUnique({ where: { externalId: paymentId } });
      if (transaction) {
        if (transaction.toUserId !== userId || transaction.currency !== "PI" || transaction.type !== TransactionType.DEPOSIT) {
          throw new Error("Transaction déjà utilisée ou invalide");
        }
        if (transaction.status !== TransactionStatus.PENDING) throw new Error("Dépôt non disponible");
        const metadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
          ? transaction.metadata as Record<string, unknown>
          : {};
        const updated = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            amount: piAmount,
            toWalletId: wallet.id,
            metadata: { ...metadata, network, approvedAt: new Date().toISOString() },
          },
        });
        return { transaction: updated, isWithdraw: false };
      }

      const existingPending = await tx.transaction.findFirst({
        where: {
          fromUserId: userId,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          currency: "PI",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingPending) {
        const metadata = existingPending.metadata && typeof existingPending.metadata === "object" && !Array.isArray(existingPending.metadata)
          ? existingPending.metadata as Record<string, unknown>
          : {};
        const updated = await tx.transaction.update({
          where: { id: existingPending.id },
          data: {
            externalId: paymentId,
            amount: piAmount,
            toWalletId: wallet.id,
            toUserId: userId,
            description: body.memo || existingPending.description || "Dépôt Pi Network",
            metadata: { ...metadata, network, approvedAt: new Date().toISOString() },
          },
        });
        return { transaction: updated, isWithdraw: false };
      }

      const created = await tx.transaction.create({
        data: {
          reference: `DEP-${paymentId.slice(-8).toUpperCase()}`,
          externalId: paymentId,
          blockchainTx: body.txid || null,
          amount: piAmount,
          currency: "PI",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          description: body.memo || "Dépôt Pi Network",
          toUserId: userId,
          toWalletId: wallet.id,
          metadata: { network, approvedAt: new Date().toISOString() },
        },
      });
      return { transaction: created, isWithdraw: false };
    }, { maxWait: 10000, timeout: 30000 });

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: result.isWithdraw ? "Retrait Pi approuvé" : "Dépôt Pi en attente",
          message: result.isWithdraw
            ? `Votre envoi de ${piAmount} PI est en attente de traitement.`
            : `Votre dépôt de ${piAmount} PI attend la confirmation de Pi Network.`,
          type: "INFO",
          metadata: JSON.stringify({
            amount: piAmount,
            currency: "PI",
            reference: result.transaction.reference,
            transactionId: result.transaction.id,
            status: "PENDING",
            network,
            toAddress: body.toAddress || null,
            blockchainTx: body.txid || null,
            paymentId,
          }),
        },
      });
    } catch {
      // Notification non bloquante.
    }

    return NextResponse.json({ success: true, transaction: result.transaction, network });
  } catch (error) {
    console.error("[PIMPAY] Erreur d'approbation Pi:", error);
    return NextResponse.json({ error: "Erreur d'approbation du paiement" }, { status: 500 });
  }
}
