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
    const { paymentId, amount, memo, txid } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 1. AUTHENTIFICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

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
      
      // Gérer le Wallet avec UPSERT (Crée le wallet s'il a été supprimé)
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: parseFloat(amount) } },
        create: {
          userId,
          currency: "PI",
          balance: parseFloat(amount),
          type: WalletType.PI
        }
      });

      // Gérer la Transaction avec UPSERT (Évite le crash si externalId existe déjà ou a disparu)
      const transaction = await tx.transaction.upsert({
        where: { externalId: paymentId },
        update: {
          status: TransactionStatus.SUCCESS, // On valide car l'approbation est faite
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
          status: TransactionStatus.SUCCESS,
          description: memo || "Dépôt Pi Network",
          toUserId: userId,
          toWalletId: wallet.id
        }
      });

      return transaction;
    });

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

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ [APPROVE_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
