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
import {
  requestPayout,
  resolveProvider,
  normalizeMsisdn,
  newPawaPayId,
  getAppBaseUrl,
} from "@/lib/pawapay";

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

    // 2.b Retrait Mobile Money : résoudre le provider PawaPay AVANT tout débit
    //     (évite d'avoir à rembourser si l'opérateur/pays n'est pas supporté).
    const isMobilePayout = method === "mobile";
    let payoutPlan:
      | {
          payoutId: string;
          provider: string;
          phone: string;
          fiatAmount: number;
          fiatCurrency: string;
        }
      | null = null;

    if (isMobilePayout) {
      const countryCode = body.countryCode || "";
      const resolved = resolveProvider(
        countryCode,
        String(details?.provider || "")
      );
      if (!resolved.supported || !resolved.provider) {
        return NextResponse.json(
          {
            error:
              "Cet opérateur / pays n'est pas encore pris en charge par notre agrégateur Mobile Money.",
          },
          { status: 400 }
        );
      }
      const phone = normalizeMsisdn(details?.phone || "");
      if (!phone) {
        return NextResponse.json(
          { error: "Numéro de téléphone du bénéficiaire manquant" },
          { status: 400 }
        );
      }
      const fiatCurrency = body.fiatCurrency || resolved.currency;
      const fiatAmount = Math.round(parseFloat(body.fiatAmount) || 0);
      if (fiatAmount <= 0) {
        return NextResponse.json(
          { error: "Montant en devise locale invalide" },
          { status: 400 }
        );
      }
      payoutPlan = {
        payoutId: newPawaPayId(),
        provider: resolved.provider,
        phone,
        fiatAmount,
        fiatCurrency,
      };
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
      // Statut :
      // - Mobile Money auto-approuvé  => PENDING (finalisé par le webhook PawaPay)
      // - Mobile Money > seuil admin   => PENDING (payout déclenché après validation admin)
      // - Autres (banque) auto-approuvé => SUCCESS (traitement manuel hors agrégateur)
      let txStatus: TransactionStatus;
      let txStatusClass: string;
      if (requiresAdminApproval) {
        txStatus = TransactionStatus.PENDING;
        txStatusClass = "MANUAL_REVIEW";
      } else if (isMobilePayout) {
        txStatus = TransactionStatus.PENDING;
        txStatusClass = "AGGREGATOR_PENDING";
      } else {
        txStatus = TransactionStatus.SUCCESS;
        txStatusClass = "AUTO_APPROVED";
      }

      const transaction = await tx.transaction.create({
        data: {
          reference: `WTH-${Date.now()}-${userId.slice(0, 4)}`.toUpperCase(),
          amount: piAmount,
          type: "WITHDRAW",
          status: txStatus,
          statusClass: txStatusClass,
          // Identifiant PawaPay pour les payouts Mobile Money (idempotence + suivi webhook)
          externalId: payoutPlan?.payoutId || null,
          fromUserId: userId,
          fromWalletId: userWallet.id,
          description: description,
          currency: "PI",
          destCurrency: payoutPlan?.fiatCurrency || targetCurrency,
          countryCode: body.countryCode || null,
          fee: conversion.fee / piPrice, // Frais convertis en PI
          // Stocker directement le numéro de compte/téléphone dans le champ DB
          accountNumber: accountNumberValue,
          accountName: body.details?.accountName || null,
          bankBic: body.details?.swift || null,
          metadata: {
            method: method, // "mobile" ou "bank"
            transferDetails: body.details,
            fiatAmount: payoutPlan?.fiatAmount ?? conversion.total,
            exchangeRate: piPrice,
            requiresAdminApproval,
            autoApproved: !requiresAdminApproval,
            submittedAt: new Date().toISOString(),
            ...(payoutPlan
              ? {
                  aggregator: "PAWAPAY",
                  pawapayPayoutId: payoutPlan.payoutId,
                  provider: payoutPlan.provider,
                  phoneNumber: payoutPlan.phone,
                  localAmount: payoutPlan.fiatAmount,
                  localCurrency: payoutPlan.fiatCurrency,
                }
              : {}),
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

      return { transaction, newBalance: updatedWallet.balance, fee: conversion.fee / piPrice, requiresAdminApproval, walletId: userWallet.id };
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

    // ── PAYOUT MOBILE MONEY via PawaPay ──────────────────────────────────────
    // Uniquement pour les retraits Mobile Money auto-approuvés (les gros montants
    // nécessitant une validation admin déclencheront le payout après approbation).
    if (payoutPlan && !result.requiresAdminApproval) {
      try {
        const callbackUrl = `${getAppBaseUrl()}/api/webhooks/pawapay/payout`;
        const pp = await requestPayout({
          payoutId: payoutPlan.payoutId,
          amount: String(payoutPlan.fiatAmount),
          currency: payoutPlan.fiatCurrency,
          phoneNumber: payoutPlan.phone,
          provider: payoutPlan.provider,
          callbackUrl,
          metadata: { reference: result.transaction.reference, userId },
        });

        const ppStatus = (pp.data?.status || "").toUpperCase();
        const accepted =
          pp.ok &&
          ["ACCEPTED", "SUBMITTED", "ENQUEUED", "PENDING"].includes(ppStatus);

        if (!accepted) {
          // Rejet immédiat de l'agrégateur → rembourser les Pi débités
          await prisma.$transaction([
            prisma.wallet.update({
              where: { id: result.walletId },
              data: { balance: { increment: piAmount } },
            }),
            prisma.transaction.update({
              where: { id: result.transaction.id },
              data: {
                status: TransactionStatus.FAILED,
                statusClass: "AGGREGATOR_REJECTED",
              },
            }),
          ]);
          const reason =
            pp.data?.rejectionReason?.rejectionMessage ||
            pp.data?.failureReason?.failureMessage ||
            pp.data?.message ||
            "Le retrait Mobile Money a été refusé par l'agrégateur.";
          return NextResponse.json({ error: reason }, { status: 400 });
        }
      } catch (payoutErr: any) {
        // Erreur réseau/technique → rembourser et marquer échoué
        await prisma
          .$transaction([
            prisma.wallet.update({
              where: { id: result.walletId },
              data: { balance: { increment: piAmount } },
            }),
            prisma.transaction.update({
              where: { id: result.transaction.id },
              data: {
                status: TransactionStatus.FAILED,
                statusClass: "AGGREGATOR_ERROR",
              },
            }),
          ])
          .catch(() => {});
        console.error("[v0] PAWAPAY_PAYOUT_ERROR:", payoutErr.message);
        return NextResponse.json(
          { error: "Erreur lors de l'envoi vers l'agrégateur Mobile Money." },
          { status: 502 }
        );
      }
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
