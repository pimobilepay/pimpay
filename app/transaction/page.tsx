import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { calculateExchangeWithFee, PI_CONSENSUS_RATE } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification via le Token JWT
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await req.json();
    const { amount, currency, phoneNumber, provider, accountName } = body;

    // 2. Validations strictes
    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0 || !phoneNumber || !provider) {
      return NextResponse.json({ error: "Données de retrait incomplètes" }, { status: 400 });
    }

    // 3. Calcul de la conversion (Pi -> Fiat)
    const conversion = calculateExchangeWithFee(piAmount, currency);

    // 4. Exécution de la transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Vérifier le solde et le statut KYC de l'utilisateur
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: "PI" } } }
      });

      const userWallet = user?.wallets[0];

      if (!userWallet || userWallet.balance < piAmount) {
        throw new Error("Solde Pi insuffisant pour cette opération");
      }

      // Optionnel: Limite de retrait si non vérifié (ex: max 50 PI)
      if (user?.kycStatus !== "APPROVED" && piAmount > 50) {
        throw new Error("Limite de retrait dépassée. Veuillez valider votre KYC.");
      }

      // B. Débiter le montant du wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: piAmount } }
      });

      // C. Créer la transaction de retrait (PENDING)
      const transaction = await tx.transaction.create({
        data: {
          id: crypto.randomUUID(),
          reference: `WTH-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase(),
          amount: piAmount,
          type: "WITHDRAWAL",
          status: "PENDING",
          fromUserId: userId,
          fromWalletId: userWallet.id,
          description: `Retrait ${provider} vers ${phoneNumber}`,
          fee: conversion.fee / PI_CONSENSUS_RATE, // Frais convertis en Pi
          metadata: {
            phoneNumber,
            provider,
            accountName,
            fiatAmount: conversion.total,
            currency: currency,
            exchangeRate: PI_CONSENSUS_RATE
          }
        }
      });

      // D. Créer une notification système pour l'utilisateur
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Retrait en cours",
          message: `Votre demande de ${piAmount} PI (${conversion.total.toFixed(2)} ${currency}) est en cours de validation.`,
          type: "PAYMENT_SENT"
        }
      });

      return { transaction, newBalance: updatedWallet.balance };
    });

    return NextResponse.json({
      success: true,
      message: "Demande de retrait transmise avec succès",
      transactionId: result.transaction.id,
      newBalance: result.newBalance,
      fiatAmount: conversion.total
    });

  } catch (error: any) {
    console.error("WITHDRAW_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur interne lors du traitement du retrait" }, 
      { status: 400 }
    );
  }
}
