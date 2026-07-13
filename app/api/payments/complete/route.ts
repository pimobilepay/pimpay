export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, WalletType, TransactionType } from "@prisma/client";
import { getPiPayment } from "@/lib/pi";

export async function POST(request: Request) {
  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!PI_API_KEY) {
      console.error("[PIMOBIPAY] PI_API_KEY non configuree");
      return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
    }

    // --- 1. AUTHENTIFICATION ---
    const userId = await getAuthUserId();
    if (!userId) {
      console.error("[PIMOBIPAY] Utilisateur non authentifie pour complete");
      return NextResponse.json({ error: "Session expiree. Veuillez vous reconnecter." }, { status: 401 });
    }

    const { paymentId, txid } = await request.json();
    if (!paymentId || !txid) {
      console.error("[PIMOBIPAY] Donnees incompletes pour complete:", { paymentId, txid });
      return NextResponse.json({ error: "Donnees incompletes (paymentId et txid requis)" }, { status: 400 });
    }

    console.log(`[PIMOBIPAY] Complete paiement: ${paymentId}, txid: ${txid}, user: ${userId}`);

    // --- 2. VALIDATION PI NETWORK (S2S) ---
    // On valide d'abord avec Pi Network pour obtenir les détails réels du paiement (montant)
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const piData = await piRes.json();
    
    // Si Pi dit que c'est déjà complété, on continue pour synchroniser notre base
    const isAlreadyCompleted = piData.message === "Payment already completed";
    
    if (!piRes.ok && !isAlreadyCompleted) {
      console.error("❌ Pi Network Error:", piData);
      return NextResponse.json({ error: "Échec validation Pi Network" }, { status: 403 });
    }

    // --- 2bis. SOURCE DE VÉRITÉ : LE MONTANT VÉRIFIÉ PAR PI NETWORK ---
    // FAILLE CORRIGÉE : auparavant on créditait `transaction.amount`, une valeur
    // d'origine cliente (créée dans /api/pi/transaction). Un utilisateur pouvait
    // donc créditer n'importe quel montant sans payer. On ne fait désormais
    // confiance QU'AU montant et au statut retournés par Pi Network.
    const piPayment = await getPiPayment(paymentId);

    if (!piPayment) {
      console.error("[PIMOBIPAY] Paiement Pi introuvable cote serveur:", paymentId);
      return NextResponse.json({ error: "Paiement Pi introuvable" }, { status: 404 });
    }

    // Le paiement doit etre verifie sur la blockchain ET avoir le txid attendu.
    const isVerified =
      piPayment.status?.transaction_verified === true ||
      piPayment.transaction?.verified === true ||
      isAlreadyCompleted;

    if (!isVerified) {
      console.error("[PIMOBIPAY] Paiement Pi non verifie:", paymentId, piPayment.status);
      return NextResponse.json(
        { error: "Paiement non verifie sur la blockchain Pi", retryable: true },
        { status: 409 }
      );
    }

    // Le txid fourni doit correspondre a celui enregistre par Pi (si present).
    const piTxid = piPayment.transaction?.txid;
    if (piTxid && txid && piTxid !== txid) {
      console.error("[PIMOBIPAY] txid incoherent:", { fourni: txid, attendu: piTxid });
      return NextResponse.json({ error: "txid incoherent avec Pi Network" }, { status: 403 });
    }

    // Montant reellement paye, valide cote serveur.
    const verifiedAmount = Number(piPayment.amount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      console.error("[PIMOBIPAY] Montant Pi invalide:", piPayment.amount);
      return NextResponse.json({ error: "Montant Pi invalide" }, { status: 400 });
    }

    // --- 3. RÉCUPÉRATION OU RÉCRÉATION DE LA TRANSACTION ---
    // Correction du crash findUnique : On utilise findUnique mais on gère l'absence
    let transaction = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    // Si la transaction n'existe pas (cas du db-clean-up), on la recrée
    if (!transaction) {
      console.warn(`[PIMOBIPAY] ⚠️ Transaction ${paymentId} absente après cleanup. Récréation...`);

      transaction = await prisma.transaction.create({
        data: {
          reference: `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          externalId: paymentId,
          amount: verifiedAmount,
          currency: "PI",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          toUserId: userId,
          description: "Récupération dépôt Pi Network"
        }
      });
    }

    // Sécurité : Éviter le double crédit
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, message: "Déjà crédité" });
    }

    // --- 4. MISE À JOUR BANCAIRE ATOMIQUE ---
    // On crédite EXCLUSIVEMENT le montant vérifié par Pi Network.
    await prisma.$transaction(async (tx) => {
      // Utilisation de upsert pour le Wallet pour éviter tout crash si le wallet PI n'existe pas
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: verifiedAmount } },
        create: {
          userId,
          currency: "PI",
          balance: verifiedAmount,
          type: WalletType.PI
        }
      });

      // Mise à jour de la transaction en SUCCESS, en alignant le montant
      // enregistre sur la valeur reellement payee.
      return await tx.transaction.update({
        where: { id: transaction!.id },
        data: {
          amount: verifiedAmount,
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          metadata: {
            completedAt: new Date().toISOString(),
            verifiedAmount,
            recoveredAfterCleanup: true
          }
        }
      });
    }, { maxWait: 10000, timeout: 30000 });
  
    console.log(`[PIMOBIPAY] Portefeuille credite : ${verifiedAmount} PI pour ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Solde mis à jour !",
      amount: verifiedAmount
    });

  } catch (error: any) {
    console.error("❌ [CRITICAL_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
