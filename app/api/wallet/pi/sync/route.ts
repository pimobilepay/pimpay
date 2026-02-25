export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("pi_session_token")?.value; // Vaccin Pi Browser

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { amount } = await req.json();

    // 1. Utilisation de l'index unique userId_currency de ton schéma
    const walletPI = await prisma.wallet.upsert({
      where: {
        userId_currency: {
          userId: userId,
          currency: "PI"
        }
      },
      update: {},
      create: {
        userId: userId,
        currency: "PI",
        balance: 0,
        type: "PI" // WalletType Enum
      }
    });

    const difference = amount - walletPI.balance;

    if (difference > 0) {
      await prisma.$transaction([
        // Mise à jour du solde
        prisma.wallet.update({
          where: { id: walletPI.id },
          data: { balance: amount }
        }),
        // Création de la transaction avec tes champs de schéma
        prisma.transaction.create({
          data: {
            reference: `PI-SYNC-${Date.now()}`,
            amount: difference,
            currency: "PI",
            type: "DEPOSIT", // TransactionType Enum
            status: "SUCCESS", // TransactionStatus Enum
            description: "Synchronisation solde Pi Réel",
            toUserId: userId,
            toWalletId: walletPI.id,
          }
        })
      ]);
    }

    return NextResponse.json({ success: true, balance: amount });
  } catch (error: any) {
    console.error("ERR_SYNC_PI:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
