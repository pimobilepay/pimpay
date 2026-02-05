export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;
    if (piToken) userId = piToken;
    else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch (e) { return NextResponse.json({ error: "Session expirée" }, { status: 401 }); }
    }

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 1. Récupérer le Wallet SIDRA
    const walletSDA = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "SDA" } }
    });

    if (!walletSDA) return NextResponse.json({ error: "Wallet Sidra non trouvé" }, { status: 404 });

    // --- LA LOGIQUE DE SÉCURITÉ ---
    // Au lieu de mettre 1.06 en dur, on pourrait imaginer un fetch réel ici
    const blockchainBalance = 1.06; // Ta valeur de test
    const difference = blockchainBalance - walletSDA.balance;

    // On ne synchronise QUE si la différence est positive et significative (évite les bugs de micro-décimales)
    if (difference > 0.000001) {
      const result = await prisma.$transaction(async (tx) => {
        // Mise à jour du solde
        const updatedWallet = await tx.wallet.update({
          where: { id: walletSDA.id },
          data: { balance: blockchainBalance }
        });

        // On vérifie si une transaction avec cette "méthode" n'a pas déjà été créée aujourd'hui
        // pour éviter de polluer l'historique à chaque rafraîchissement
        const alreadySynced = await tx.transaction.findFirst({
          where: {
            toWalletId: walletSDA.id,
            metadata: { path: ["method"], equals: "auto_sync" },
            createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } // Depuis minuit
          }
        });

        if (!alreadySynced) {
          await tx.transaction.create({
            data: {
              reference: `SDA-SYNC-${uuidv4().slice(0, 8).toUpperCase()}`,
              amount: difference,
              currency: "SDA",
              type: "DEPOSIT",
              status: "SUCCESS",
              description: "Synchro Sidra Chain",
              toUserId: userId,
              toWalletId: walletSDA.id,
              metadata: { method: "auto_sync", syncedAt: new Date().toISOString() }
            }
          });
        }
        return updatedWallet;
      });

      return NextResponse.json({ success: true, added: difference });
    }

    return NextResponse.json({ success: true, message: "Solde à jour" });

  } catch (error: any) {
    console.error("❌ [SIDRA_SYNC_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur synchro" }, { status: 500 });
  }
}
