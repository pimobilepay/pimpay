export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { calculateExchangeWithFee, PI_CONSENSUS_RATE } from "@/lib/exchange";
import { TransactionStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification via le Token JWT
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await req.json();
    const { amount, method, currency, details } = body; 
    // details contient soit {phone, provider} soit {iban, bankName, swift}

    // 2. Validations strictes
    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 3. Calcul de la conversion (Pi -> Fiat)
    const targetCurrency = currency || "USD";
    const conversion = calculateExchangeWithFee(piAmount, targetCurrency);

    // 4. Exécution de la transaction atomique (Prisma $transaction)
    const result = await prisma.$transaction(async (tx) => {

      // A. Vérifier l'utilisateur et son solde
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: "PI" } } }
      });

      const userWallet = user?.wallets[0];

      if (!userWallet || userWallet.balance < piAmount) {
        throw new Error("Solde Pi insuffisant pour cette opération");
      }

      // B. Vérification du statut KYC pour les limites
      if (user?.kycStatus !== "VERIFIED" && piAmount > 50) {
        throw new Error("Limite de retrait (50 PI) dépassée pour les comptes non vérifiés.");
      }

      // C. Débiter le montant du wallet immédiatement (Sécurité Anti-Double dépense)
      const updatedWallet = await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: piAmount } }
      });

      // D. Préparation de la description selon la méthode
      let description = `Retrait ${method}`;
      if (method === "mobile") description = `Retrait Mobile Money (${body.details?.provider})`;
      if (method === "bank") description = `Retrait Bancaire (${body.details?.bankName})`;

      // E. Créer la transaction de retrait (PENDING)
      // Note: On utilise 'purpose' à la place de 'type' pour correspondre à ton schéma
      const transaction = await tx.transaction.create({
        data: {
          reference: `WTH-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase(),
          amount: piAmount,
          purpose: "WITHDRAWAL", 
          status: TransactionStatus.PENDING,
          fromUserId: userId,
          fromWalletId: userWallet.id,
          description: description,
          currency: "PI",
          destCurrency: targetCurrency,
          fee: conversion.fee / PI_CONSENSUS_RATE, // Frais convertis en PI
          metadata: {
            method: method, // "mobile" ou "bank"
            transferDetails: body.details,
            fiatAmount: conversion.total,
            exchangeRate: PI_CONSENSUS_RATE,
            submittedAt: new Date().toISOString()
          }
        }
      });

      // F. Créer une notification système
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Demande de retrait reçue",
          message: `Votre retrait de ${piAmount} PI est en attente de traitement (${method}).`,
          type: "INFO"
        }
      });

      return { transaction, newBalance: updatedWallet.balance };
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: "Demande de retrait transmise avec succès",
      reference: result.transaction.reference,
      newBalance: result.newBalance
    });

  } catch (error: any) {
    console.error("WITHDRAW_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du traitement du retrait" },
      { status: 400 }
    );
  }
}
