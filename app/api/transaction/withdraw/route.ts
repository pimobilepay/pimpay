export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { calculateExchangeWithFee } from "@/lib/exchange";
import { TransactionStatus } from "@prisma/client";
import { getFeeConfig, getPiPrice } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import {
  assertDailyWithdrawalCount,
  evaluatePiWithdrawal,
  WithdrawalPolicyError,
} from "@/lib/withdrawal-limits";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification via JWT (lib/auth)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    const userId = payload.id;

    const body = await req.json();
    const { amount, method, currency, details } = body; 
    // details contient soit {phone, provider} soit {iban, bankName, swift}

    // 2. Validations strictes
    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 3. Calcul de la conversion (Pi -> Fiat) - Frais centralisés + prix Pi admin
    const targetCurrency = currency || "USD";
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const conversion = calculateExchangeWithFee(piAmount, targetCurrency, feeConfig.withdrawFee, piPrice);

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

      // B. POLITIQUE DE RETRAIT (KYC + plafonds + limite journaliere)
      // - > 5 Pi : KYC verifie obligatoire
      // - compte verifie : max 100 Pi / transaction
      // - max 10 retraits / jour
      // - > 50 Pi (verifie) : validation admin obligatoire
      await assertDailyWithdrawalCount(tx, userId);
      const { requiresAdminApproval } = evaluatePiWithdrawal({
        amountPi: piAmount,
        kycStatus: user?.kycStatus,
      });

      // C. Débiter le montant du wallet immédiatement (Sécurité Anti-Double dépense)
      const updatedWallet = await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: piAmount } }
      });

      // D. Préparation de la description selon la méthode
      let description = `Retrait ${method}`;
      let accountNumberValue: string | null = null;
      
      if (method === "mobile") {
        description = `Retrait Mobile Money (${body.details?.provider})`;
        // Stocker le numéro de téléphone du bénéficiaire
        accountNumberValue = body.details?.phone || null;
      } else if (method === "bank") {
        description = `Retrait Bancaire (${body.details?.bankName})`;
        // Stocker le numéro de compte bancaire
        accountNumberValue = body.details?.accountNumber || body.details?.iban || null;
      }

      // E. Créer la transaction de retrait (PENDING)
      // Note: On stocke accountNumber directement dans le champ DB pour faciliter l'affichage admin
      const transaction = await tx.transaction.create({
        data: {
          reference: `WTH-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase(),
          amount: piAmount,
          type: "WITHDRAW",
          // Grand montant => en attente d'une validation admin.
          // Petit montant => auto-approuve (paiement traite manuellement, hors worker on-chain).
          status: requiresAdminApproval ? TransactionStatus.PENDING : TransactionStatus.SUCCESS,
          statusClass: requiresAdminApproval ? "MANUAL_REVIEW" : "AUTO_APPROVED",
          fromUserId: userId,
          fromWalletId: userWallet.id,
          description: description,
          currency: "PI",
          destCurrency: targetCurrency,
          fee: conversion.fee / piPrice, // Frais convertis en PI
          // Stocker directement le numéro de compte/téléphone dans le champ DB
          accountNumber: accountNumberValue,
          accountName: body.details?.accountName || null,
          bankBic: body.details?.swift || null,
          metadata: {
            method: method, // "mobile" ou "bank"
            transferDetails: body.details,
            fiatAmount: conversion.total,
            exchangeRate: piPrice,
            requiresAdminApproval,
            autoApproved: !requiresAdminApproval,
            submittedAt: new Date().toISOString()
          }
        }
      });

      // F. Créer une notification système
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Demande de retrait reçue",
          message: requiresAdminApproval
            ? `Votre retrait de ${piAmount} PI (${method}) dépasse ${50} PI et doit être validé par un administrateur.`
            : `Votre retrait de ${piAmount} PI est en cours de traitement (${method}).`,
          type: "INFO"
        }
      });

      return { transaction, newBalance: updatedWallet.balance, fee: conversion.fee / piPrice, requiresAdminApproval };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    if (result.fee > 0) {
      autoConvertFeeToPi(
        result.fee,
        "PI",
        result.transaction.id,
        result.transaction.reference
      ).catch((err) => {
        console.error("[WITHDRAW] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: result.requiresAdminApproval
        ? "Demande de retrait transmise. En attente de validation administrateur."
        : "Demande de retrait transmise avec succès",
      requiresAdminApproval: result.requiresAdminApproval,
      reference: result.transaction.reference,
      newBalance: result.newBalance
    });

  } catch (error: any) {
    // Violations de politique de retrait (KYC, plafonds, limite journaliere)
    if (error instanceof WithdrawalPolicyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("WITHDRAW_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du traitement du retrait" },
      { status: 400 }
    );
  }
}
