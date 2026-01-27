export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const { amount, currency, address, pin } = await req.json();

    // 2. RÉCUPÉRATION CONFIGURATION & UTILISATEUR
    const [config, user] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } }),
      prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { wallets: true } 
      })
    ]);

    if (!user || !user.pin) return NextResponse.json({ error: "Sécurité non configurée" }, { status: 403 });

    // 3. CALCUL DES FRAIS (Ex: 1% ou valeur par défaut)
    const feePercent = config?.transactionFee || 0.01; // 0.01 = 1%
    const feeAmount = amount * feePercent;
    const totalToDeduct = amount + feeAmount;

    // 4. VÉRIFICATIONS DE SÉCURITÉ
    // a. Le PIN
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });

    // b. Le Solde (Montant + Frais)
    const wallet = user.wallets.find(w => w.currency === currency.toUpperCase());
    if (!wallet || wallet.balance < totalToDeduct) {
      return NextResponse.json({ 
        error: "Solde insuffisant pour couvrir le montant et les frais",
        details: `Requis: ${totalToDeduct} ${currency}` 
      }, { status: 400 });
    }

    // c. Limites quotidiennes (Exemple 1000 USD/PI)
    if (amount > user.dailyLimit) {
      return NextResponse.json({ error: "Limite quotidienne dépassée" }, { status: 400 });
    }

    // 5. EXÉCUTION DE LA TRANSACTION (ATOMIQUE)
    const txRef = `PP-W-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Déduire du Wallet (Montant + Frais)
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: totalToDeduct } }
      });

      // Créer la transaction de retrait
      const withdrawTx = await tx.transaction.create({
        data: {
          reference: txRef,
          amount: amount,
          fee: feeAmount,
          netAmount: amount, // Ce que l'utilisateur reçoit réellement
          currency: currency.toUpperCase(),
          type: "WITHDRAW",
          status: "PENDING",
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Retrait ${currency} vers ${address.substring(0, 10)}...`,
          metadata: { destination: address, feeApplied: `${feePercent * 100}%` }
        }
      });

      // Optionnel: Mettre à jour les profits de la banque dans SystemConfig
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { totalProfit: { increment: feeAmount } }
      });

      return { updatedWallet, withdrawTx };
    });

    // 6. NOTIFICATION DÉTAILLÉE
    await prisma.notification.create({
      data: {
        userId,
        title: "Retrait envoyé",
        message: `${amount} ${currency} envoyés (Frais: ${feeAmount} ${currency})`,
        type: "PAYMENT",
        metadata: { txRef: result.withdrawTx.reference }
      }
    });

    return NextResponse.json({
      success: true,
      txRef: result.withdrawTx.reference,
      newBalance: result.updatedWallet.balance,
      feePaid: feeAmount
    });

  } catch (error: any) {
    console.error("WITHDRAW_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du retrait" }, { status: 500 });
  }
}
