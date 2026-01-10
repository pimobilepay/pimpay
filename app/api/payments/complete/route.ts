export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ton_secret_par_defaut";
const PI_API_KEY = process.env.PI_API_KEY!;

export async function POST(req: Request) {
  try {
    // 1. Récupérer l'utilisateur connecté via le cookie
    const cookieStore = cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const userId = decoded.id;

    // 2. Récupérer les données envoyées par le SDK Pi
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données de transaction manquantes" }, { status: 400 });
    }

    // 3. Notifier Pi Network
    const piResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid }),
    });

    if (!piResponse.ok) {
      const errorData = await piResponse.json();
      console.error("PI_API_ERROR:", errorData);
      throw new Error("Impossible de finaliser le paiement sur le serveur Pi");
    }

    // 4. Récupérer les détails du paiement depuis Pi
    const paymentDetailsResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: "GET",
      headers: { "Authorization": `Key ${PI_API_KEY}` }
    });
    const paymentData = await paymentDetailsResponse.json();
    const amount = paymentData.amount;

    // 5. TRANSACTION PRISMA : Mise à jour du Wallet (Correct selon ton schéma)
    const result = await prisma.$transaction(async (tx) => {
      // On cherche d'abord le wallet PI
      const wallet = await tx.wallet.findUnique({
        where: {
          userId_currency: {
            userId: userId,
            currency: "PI"
          }
        }
      });

      if (!wallet) throw new Error("Wallet PI introuvable");

      // Mise à jour du solde du WALLET
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount }
        }
      });

      // Création de la transaction dans ton historique
      await tx.transaction.create({
        data: {
          reference: paymentId,
          amount: amount,
          type: "DEPOSIT",
          status: "COMPLETED",
          fromUserId: userId,
          description: `Dépôt via Pi Network (TX: ${txid.substring(0, 8)}...)`,
          metadata: { txid, paymentId }
        }
      });

      return updatedWallet;
    });

    return NextResponse.json({
      success: true,
      newBalance: result.balance
    });

  } catch (error: any) {
    console.error("PAYMENT_COMPLETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du compte" }, { status: 500 });
  }
}
