export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Vérifier que l'appelant est bien connecté
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value || cookieStore.get("token")?.value;
    const SECRET = process.env.JWT_SECRET;

    if (!token || !SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const authUserId = payload.id as string;

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 2. RÉCUPÉRATION : Trouver la transaction PENDING appartenant à cet utilisateur
    const transaction = await prisma.transaction.findFirst({
      where: { 
        OR: [
          { reference: reference },
          { externalId: reference }
        ],
        status: "PENDING",
        toUserId: authUserId // Sécurité : on ne valide que si c'est pour MOI
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable ou déjà validée" }, { status: 404 });
    }

    // 3. CALCULS BANCAIRES
    const fee = transaction.fee || 0;
    const netAmount = transaction.amount - fee;

    // 4. ATOMICITÉ : Transaction Prisma
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Mise à jour ou création du Wallet (ex: PI ou USD)
      const wallet = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: authUserId,
            currency: transaction.currency,
          },
        },
        update: {
          balance: { increment: netAmount },
        },
        create: {
          userId: authUserId,
          currency: transaction.currency,
          balance: netAmount,
          type: transaction.currency === "PI" ? "PI" : "FIAT",
        },
      });

      // B. Mise à jour de la transaction
      const completedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          netAmount: netAmount,
          toWalletId: wallet.id,
          description: transaction.description || `Dépôt ${transaction.currency} réussi`
        },
      });

      // C. Création d'une notification pour l'utilisateur
      await tx.notification.create({
        data: {
          userId: authUserId,
          title: "Dépôt confirmé ✅",
          message: `Votre compte a été crédité de ${netAmount} ${transaction.currency}.`,
          type: "success"
        }
      });

      return { completedTx, wallet };
    });

    return NextResponse.json({ 
      success: true, 
      status: "SUCCESS",
      balance: result.wallet.balance 
    });

  } catch (error: any) {
    console.error("[CONFIRM_ERROR]:", error);
    return NextResponse.json({
      error: "Erreur lors de la validation",
      message: error.message
    }, { status: 500 });
  }
}
