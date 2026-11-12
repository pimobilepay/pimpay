export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { completePiPayment, getPiNetwork, getPiPayment } from "@/lib/pi";
import { resolvePimCoins } from "@/lib/pim-packages";

function belongsToUser(
  payment: NonNullable<Awaited<ReturnType<typeof getPiPayment>>>,
  _userId: string,
  piUserId: string | null
) {
  return Boolean(payment.user_uid && piUserId && payment.user_uid === piUserId);
}

function isVerified(payment: NonNullable<Awaited<ReturnType<typeof getPiPayment>>>) {
  return payment.status?.transaction_verified === true || payment.transaction?.verified === true;
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    let body: { paymentId?: string; txid?: string; metadata?: { productId?: string } };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const txid = typeof body.txid === "string" ? body.txid.trim() : "";
    if (!paymentId || paymentId.length > 256 || !txid || txid.length > 256) {
      return NextResponse.json({ error: "paymentId ou txid invalide" }, { status: 400 });
    }

    const [transaction, user] = await Promise.all([
      prisma.transaction.findUnique({ where: { externalId: `PIM-${paymentId}` } }),
      prisma.user.findUnique({ where: { id: userId }, select: { piUserId: true } }),
    ]);

    if (!transaction || transaction.toUserId !== userId || transaction.type !== TransactionType.DEPOSIT || transaction.currency !== "PIM") {
      return NextResponse.json({ error: "Achat PIM introuvable pour cet utilisateur" }, { status: 404 });
    }
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, alreadyCredited: true, pimCoins: transaction.amount });
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: "Cet achat PIM n'est plus en attente" }, { status: 409 });
    }

    const storedMetadata = transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
      ? transaction.metadata as Record<string, unknown>
      : {};
    const productId = typeof storedMetadata.productId === "string" ? storedMetadata.productId : "";
    if (!productId || (body.metadata?.productId && body.metadata.productId !== productId)) {
      return NextResponse.json({ error: "Le produit ne correspond pas à l'achat approuvé" }, { status: 409 });
    }

    let payment = await getPiPayment(paymentId);
    if (!payment || payment.identifier !== paymentId || !belongsToUser(payment, userId, user?.piUserId ?? null)) {
      return NextResponse.json({ error: "Paiement Pi introuvable ou associé à un autre utilisateur" }, { status: 403 });
    }
    const network = await getPiNetwork();
    if (payment.metadata?.network && payment.metadata.network !== network) {
      return NextResponse.json({ error: "Le paiement PIM appartient à un autre réseau Pi" }, { status: 409 });
    }
    if (typeof storedMetadata.network === "string" && storedMetadata.network !== network) {
      return NextResponse.json({ error: "L'achat PIM est enregistré sur un autre réseau Pi" }, { status: 409 });
    }

    const amount = Number(payment.amount);
    const resolved = resolvePimCoins(productId, amount);
    if (!resolved.ok || resolved.pimCoins !== transaction.amount) {
      return NextResponse.json({ error: resolved.reason || "Montant Pi incompatible avec le produit approuvé" }, { status: 409 });
    }

    if (payment.transaction?.txid && payment.transaction.txid !== txid) {
      return NextResponse.json({ error: "Le txid ne correspond pas au paiement Pi" }, { status: 403 });
    }
    if (!isVerified(payment)) {
      const completion = await completePiPayment(paymentId, txid);
      if (!completion.ok) {
        return NextResponse.json({ error: "Pi n'a pas encore confirmé la transaction", retryable: true }, { status: 409 });
      }
      payment = await getPiPayment(paymentId);
    }
    if (
      !payment ||
      !belongsToUser(payment, userId, user?.piUserId ?? null) ||
      !isVerified(payment) ||
      (payment.metadata?.network && payment.metadata.network !== network)
    ) {
      return NextResponse.json({ error: "Paiement non vérifié sur le réseau Pi actif", retryable: true }, { status: 409 });
    }
    if (payment.transaction?.txid && payment.transaction.txid !== txid) {
      return NextResponse.json({ error: "Le txid confirmé ne correspond pas" }, { status: 403 });
    }

    const settled = await prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: {
          id: transaction.id,
          toUserId: userId,
          currency: "PIM",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
        },
        data: { status: TransactionStatus.SUCCESS, amount: resolved.pimCoins, blockchainTx: txid },
      });
      if (claim.count !== 1) return null;

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PIM" } },
        update: { balance: { increment: resolved.pimCoins } },
        create: { userId, currency: "PIM", balance: resolved.pimCoins, type: WalletType.CRYPTO },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          toWalletId: wallet.id,
          metadata: {
            ...storedMetadata,
            piAmount: amount,
            productId,
            bonus: resolved.bonus,
            network,
            purchasedAt: new Date().toISOString(),
          },
        },
      });
      return { wallet, balance: wallet.balance };
    }, { maxWait: 10000, timeout: 30000 });

    if (!settled) {
      const latest = await prisma.transaction.findUnique({ where: { id: transaction.id } });
      if (latest?.status === TransactionStatus.SUCCESS && latest.toUserId === userId) {
        return NextResponse.json({ success: true, alreadyCredited: true, pimCoins: latest.amount });
      }
      return NextResponse.json({ error: "L'achat a déjà été traité ou a changé d'état" }, { status: 409 });
    }

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "PIM Coins ajoutés",
          message: `Vous avez reçu ${resolved.pimCoins} PIM Coins.`,
          type: "SUCCESS",
          metadata: JSON.stringify({ pimCoins: resolved.pimCoins, piAmount: amount, transactionId: transaction.id, productId, network }),
        },
      });
    } catch {
      // Notification non bloquante.
    }

    return NextResponse.json({ success: true, pimCoins: resolved.pimCoins, newBalance: settled.balance, network });
  } catch (error) {
    console.error("[PIMPAY] Erreur achat PIM:", error);
    return NextResponse.json({ error: "Erreur lors de l'achat PIM" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const wallet = await prisma.wallet.findUnique({ where: { userId_currency: { userId, currency: "PIM" } } });
    return NextResponse.json({ balance: wallet?.balance || 0, currency: "PIM" });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
