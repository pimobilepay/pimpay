export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
// Import des Enums pour garantir la compatibilité avec ton schéma
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { paymentId, amount, memo, txid, toAddress, currency } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 1. AUTHENTIFICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // Determine if this is a withdraw (external send) or deposit
    const isWithdraw = !!toAddress && currency === "PI";

    // 2. APPROBATION S2S (Server-to-Server) avec Pi Network
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
    });

    if (!approveRes.ok) {
      const err = await approveRes.json();
      // Si c'est déjà approuvé, on ne bloque pas la logique Prisma
      if (err.message !== "Payment already approved") {
        console.error("❌ Erreur Pi Approve:", err);
        return NextResponse.json({ error: "Pi Network refuse l'approbation" }, { status: 403 });
      }
    }

    // 3. TRANSACTION ATOMIQUE PRISMA (Sécurisée contre le cleanup)
    const result = await prisma.$transaction(async (tx) => {
      
      // Gérer le Wallet avec UPSERT (Crée le wallet s'il n'existe pas encore)
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: {},
        create: {
          userId,
          currency: "PI",
          balance: 0,
          type: WalletType.PI
        }
      });

      let transaction;

      if (isWithdraw) {
        // WITHDRAW: Envoi externe vers une adresse Pi
        // Vérifier le solde avant de créer la transaction
        if (wallet.balance < parseFloat(amount)) {
          throw new Error("Solde PI insuffisant");
        }

        // Débiter immédiatement le wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: parseFloat(amount) } }
        });

        // Créer la transaction de retrait
        transaction = await tx.transaction.create({
          data: {
            reference: `WD-PI-${paymentId.slice(-8).toUpperCase()}`,
            externalId: paymentId,
            blockchainTx: txid || null,
            amount: parseFloat(amount),
            currency: "PI",
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.PENDING,
            description: `Envoi Pi vers ${toAddress.substring(0, 8)}...${toAddress.substring(toAddress.length - 4)}`,
            fromUserId: userId,
            fromWalletId: wallet.id,
            metadata: {
              toAddress,
              network: "Pi Network",
              approvedAt: new Date().toISOString()
            }
          }
        });
      } else {
        // DEPOSIT: Réception de Pi
        // Chercher la transaction PENDING existante créée par /api/pi/transaction
        const existingPendingTx = await tx.transaction.findFirst({
          where: {
            fromUserId: userId,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.PENDING,
            currency: "PI",
          },
          orderBy: { createdAt: "desc" }
        });

        if (existingPendingTx) {
          // Mettre à jour la transaction existante au lieu d'en créer une nouvelle
          transaction = await tx.transaction.update({
            where: { id: existingPendingTx.id },
            data: {
              externalId: paymentId,
              blockchainTx: txid || null,
              toWalletId: wallet.id,
              toUserId: userId,
              description: memo || existingPendingTx.description || "Dépôt Pi Network",
            }
          });
        } else {
          // Fallback : upsert sur externalId si aucune transaction PENDING trouvée
          transaction = await tx.transaction.upsert({
            where: { externalId: paymentId },
            update: {
              blockchainTx: txid || null,
              toWalletId: wallet.id
            },
            create: {
              reference: `DEP-${paymentId.slice(-6).toUpperCase()}`,
              externalId: paymentId,
              blockchainTx: txid || null,
              amount: parseFloat(amount),
              currency: "PI",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.PENDING,
              description: memo || "Dépôt Pi Network",
              toUserId: userId,
              toWalletId: wallet.id
            }
          });
        }
      }

      return { transaction, isWithdraw };
    }, { maxWait: 10000, timeout: 30000 });

    // 4. COMPLÉTION FINALE (Optionnel ici car souvent géré par le callback complete, mais sécurisant)
    // On ne bloque pas si ça échoue ici, car le SDK s'en chargera
    fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid: txid || "" }),
    }).catch(e => console.warn("⚠️ Pi /complete auto-call skip"));

    // 5. NOTIFICATION utilisateur pour confirmation instantanee avec metadonnees completes
    try {
      const depositAmount = parseFloat(amount);
      const fee = 0; // Frais Pi (modifiable si besoin)
      const netAmount = depositAmount - fee;
      
      await prisma.notification.create({
        data: {
          userId,
          title: result.isWithdraw ? "Retrait Pi approuve !" : "Depot Pi approuve !",
          message: result.isWithdraw 
            ? `Votre envoi de ${depositAmount} PI vers ${toAddress?.substring(0, 8)}... est en cours de traitement.`
            : `Votre depot de ${depositAmount} PI a ete credite automatiquement.`,
          type: result.isWithdraw ? "PAYMENT_SENT" : "SUCCESS",
          metadata: JSON.stringify({
            amount: netAmount,
            currency: "PI",
            fee: fee,
            reference: result.transaction?.reference || `PI-${paymentId?.slice(-8)}`,
            transactionId: result.transaction?.id,
            method: "Pi Network",
            status: "SUCCESS",
            network: "Pi Mainnet",
            walletAddress: toAddress || null,
            blockchainTx: txid || null,
            paymentId: paymentId,
          }),
        }
      });
    } catch (_) { /* notification non-bloquante */ }

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ [APPROVE_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
