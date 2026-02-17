export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. Récupération des données
    const body = await req.json();
    const { txHash, paymentId, provider, amount } = body;

    // Référence externe (Hash blockchain ou ID de paiement Pi)
    const externalRef = txHash || paymentId;
    if (!externalRef) {
      return NextResponse.json({ error: "Référence de transaction manquante" }, { status: 400 });
    }

    // 3. Anti-doublon strict
    const existingTx = await prisma.transaction.findFirst({
      where: {
        OR: [
          { blockchainTx: externalRef },
          { reference: externalRef }
        ]
      }
    });

    if (existingTx) {
      return NextResponse.json({ error: "Cette transaction a déjà été traitée" }, { status: 400 });
    }

    // 4. Identification du Wallet (Exception Pi Browser vs Normal)
    const currency = provider === "PI" ? "PI" : "USDT";
    const userWallet = await prisma.wallet.findFirst({
      where: { userId, currency }
    });

    if (!userWallet) {
      return NextResponse.json({ error: `Portefeuille ${currency} introuvable` }, { status: 404 });
    }

    // 5. Création de la transaction dans PimPay
    // Si paymentId existe, c'est le SDK Pi Browser -> On valide direct
    const isPiAutomatic = !!paymentId; 
    const finalAmount = parseFloat(amount) || 0;

    const deposit = await prisma.transaction.create({
      data: {
        reference: `DEP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        amount: finalAmount,
        blockchainTx: externalRef,
        type: "DEPOSIT",
        status: isPiAutomatic ? "COMPLETED" : "PENDING",
        fromUserId: userId,
        toUserId: userId,
        toWalletId: userWallet.id,
        description: isPiAutomatic ? "Dépôt Pi Browser (Automatique)" : `Dépôt ${provider} (Manuel)`,
        metadata: {
          txHash,
          paymentId,
          method: provider,
          processedAt: new Date().toISOString()
        }
      }
    });

    // 6. Mise à jour du solde IMMÉDIATE pour Pi Browser uniquement
    if (isPiAutomatic) {
      await prisma.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { increment: finalAmount } }
      });
    }

    // 7. Notification de confirmation
    await prisma.notification.create({
      data: {
        userId,
        title: isPiAutomatic ? "Dépôt réussi !" : "Dépôt en attente",
        message: isPiAutomatic 
          ? `Votre compte a été crédité de ${finalAmount} ${currency}.`
          : `Nous vérifions votre dépôt de ${finalAmount} ${currency}.`,
        type: "INFO"
      }
    });

    return NextResponse.json({
      success: true,
      reference: deposit.reference,
      amount: deposit.amount,
      status: deposit.status
    });

  } catch (error: any) {
    console.error("DEPOSIT_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors du traitement du dépôt" }, { status: 500 });
  }
}
