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
  enforcePiPolicy,
  assertDailyWithdrawalCount,
  resolveUserLimits,
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

    // 2.c Devise SOURCE du retrait : le wallet réellement sélectionné par
    //     l'utilisateur (peut être "PI" ou un wallet fiat déjà crédité par un
    //     dépôt Mobile Money / carte, ex: XAF, XOF, EUR...).
    //     [FIX] Avant ce correctif, le solde était TOUJOURS vérifié/débité sur
    //     le wallet "PI", même quand l'utilisateur avait sélectionné un wallet
    //     fiat dans l'interface → message erroné "Solde Pi insuffisant".
    const sourceCurrency = String(currency || "PI").toUpperCase();
    const isPiSource = sourceCurrency === "PI";

    // 3. Calcul de la conversion (Pi -> Fiat) - Frais centralisés + prix Pi admin
    //    Uniquement pertinent quand la source du retrait est le wallet PI.
    const targetCurrency = currency || "USD";
    const feeConfig = await getFeeConfig();
    const piPrice = await getPiPrice();
    const conversion = calculateExchangeWithFee(piAmount, targetCurrency, feeConfig.withdrawFee, piPrice);
    // Pour un wallet fiat retiré dans sa propre devise : pas de conversion,
    // seuls les frais de la plateforme s'appliquent directement au montant saisi.
    const directFee = piAmount * feeConfig.withdrawFee;
    const directNet = piAmount - directFee;

    // 4. Exécution de la transaction atomique (Prisma $transaction)
    const result = await prisma.$transaction(async (tx) => {

      // A. Vérifier l'utilisateur et son solde DANS LA DEVISE SOURCE sélectionnée
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { currency: sourceCurrency } } }
      });

      const userWallet = user?.wallets[0];

      if (!userWallet || userWallet.balance < piAmount) {
        throw new Error(
          isPiSource
            ? "Solde Pi insuffisant pour cette opération"
            : `Solde ${sourceCurrency} insuffisant pour cette opération`
        );
      }

      // B. POLITIQUE DE RETRAIT ADMINISTREE (/admin/limits)
      // Les plafonds (franchise KYC, max par transaction, seuil de validation
      // admin, nombre et volume journaliers) sont dénommés en Pi : ils n'ont
      // de sens QUE pour un retrait qui débite réellement le wallet Pi (ou une
      // crypto, valorisable en Pi/USD de façon fiable).
      // [FIX] Un wallet FIAT (XOF, XAF, EUR, USD...) déjà crédité par un dépôt
      // Mobile Money/carte est retiré DANS SA PROPRE devise, sans jamais
      // toucher au Pi : le convertir artificiellement en "équivalent Pi" via
      // le taux FIAT_RATES/prix Pi produisait un montant fictif qui pouvait
      // dépasser le plafond (ex: 100 Pi) pour un simple retrait de quelques
      // dizaines de milliers de XOF, avec un message d'erreur "100 Pi" absurde
      // puisqu'aucun Pi n'est en jeu. Pour un wallet fiat, on n'applique donc
      // QUE la limite du nombre de retraits par jour (pas de plafond par
      // montant ni de conversion) ; la conversion Pi reste utilisée
      // uniquement pour un retrait crypto (source = wallet PI).
      let requiresAdminApproval = false;
      if (isPiSource) {
        const res = await enforcePiPolicy(tx, {
          userId,
          amountPi: piAmount,
          kycStatus: user?.kycStatus,
          role: user?.role,
          channel: "WITHDRAW",
        });
        requiresAdminApproval = res.requiresAdminApproval;
      } else {
        const fiatLimits = await resolveUserLimits({
          userId,
          role: user?.role,
          kycStatus: user?.kycStatus,
          channel: "WITHDRAW",
          db: tx,
        });
        await assertDailyWithdrawalCount(tx, userId, fiatLimits.maxPerDay);
      }

      // C. Débiter le montant du wallet source immédiatement (Sécurité Anti-Double dépense)
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
          currency: sourceCurrency,
          destCurrency: payoutPlan?.fiatCurrency || targetCurrency,
          countryCode: body.countryCode || null,
          // PI source : frais convertis en PI. Wallet fiat : frais déjà dans
          // la devise du wallet débité, pas de conversion supplémentaire.
          fee: isPiSource ? conversion.fee / piPrice : directFee,
          // Stocker directement le numéro de compte/téléphone dans le champ DB
          accountNumber: accountNumberValue,
          accountName: body.details?.accountName || null,
          bankBic: body.details?.swift || null,
          metadata: {
            method: method, // "mobile" ou "bank"
            transferDetails: body.details,
            fiatAmount: payoutPlan?.fiatAmount ?? (isPiSource ? conversion.total : directNet),
            exchangeRate: isPiSource ? piPrice : 1,
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
            ? `Votre retrait de ${piAmount} ${sourceCurrency} (${method}) dépasse le seuil autorisé et doit être validé par un administrateur.`
            : `Votre retrait de ${piAmount} ${sourceCurrency} est en cours de traitement (${method}).`,
          type: "INFO"
        }
      });

      return {
        transaction,
        newBalance: updatedWallet.balance,
        fee: isPiSource ? conversion.fee / piPrice : directFee,
        requiresAdminApproval,
        walletId: userWallet.id,
      };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    // Uniquement pertinent quand la source du retrait est le wallet PI : les
    // frais prélevés sur un wallet fiat sont déjà dans cette devise fiat.
    if (isPiSource && result.fee > 0) {
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
