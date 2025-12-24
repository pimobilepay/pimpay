export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { sendNotification } from "@/lib/notifications";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const userId = decoded.id;

    // 2. Récupération des données
    const { phoneNumber, amount, operator, countryCode, piAmount } = await req.json();

    // 3. Vérification du solde du portefeuille Pi
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "PI" } }
    });

    if (!wallet || wallet.balance < parseFloat(piAmount)) {
      return NextResponse.json({ error: "Solde Pi insuffisant" }, { status: 400 });
    }

    // 4. Transaction Atomique (Débit + Création Log)
    const result = await prisma.$transaction(async (tx) => {
      // Débiter le compte
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: parseFloat(piAmount) } }
      });

      // Créer la transaction
      return await tx.transaction.create({
        data: {
          reference: `TOPUP-${Date.now()}`,
          amount: parseFloat(piAmount),
          type: "PAYMENT",
          status: "SUCCESS",
          description: `Recharge mobile ${operator} pour ${phoneNumber}`,
          fromUserId: userId,
          fromWalletId: wallet.id,
        },
      });
    });

    // 5. Envoyer une notification système
    await sendNotification({
      userId,
      title: "Recharge réussie",
      message: `Votre recharge de ${amount} USD vers ${phoneNumber} a été effectuée.`,
      type: "success"
    });

    return NextResponse.json({ success: true, txId: result.id });

  } catch (error: any) {
    console.error("RECHARGE_ERROR:", error);
    return NextResponse.json({ error: "Échec du processus de recharge" }, { status: 500 });
  }
}
