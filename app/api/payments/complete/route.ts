export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const PI_API_KEY = process.env.PI_API_KEY!;

export async function POST(req: Request) {
  try {
    // 1. Récupérer l'utilisateur connecté via le cookie
    const token = cookies().get("pimpay_token")?.value;
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

    // 3. Notifier Pi Network que nous avons validé la transaction blockchain
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

    // 4. Récupérer les détails du paiement depuis Pi pour connaître le montant exact
    const paymentDetailsResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: "GET",
      headers: { "Authorization": `Key ${PI_API_KEY}` }
    });
    const paymentData = await paymentDetailsResponse.json();
    const amount = paymentData.amount; // Le montant payé en Pi

    // 5. TRANSACTION PRISMA : Mettre à jour la balance et créer un historique
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Ajouter le montant à la balance de l'utilisateur
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount
          }
        }
      });

      // Créer une trace dans l'historique des transactions (si tu as une table Transaction)
      // await tx.transaction.create({
      //   data: {
      //     userId: userId,
      //     amount: amount,
      //     type: "DEPOSIT",
      //     status: "COMPLETED",
      //     piPaymentId: paymentId
      //   }
      // });

      return user;
    });

    console.log(`SUCCÈS : ${amount} Pi ajoutés au compte de ${updatedUser.email}`);

    return NextResponse.json({ 
      success: true, 
      newBalance: updatedUser.balance 
    });

  } catch (error) {
    console.error("PAYMENT_COMPLETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du compte" }, { status: 500 });
  }
}
