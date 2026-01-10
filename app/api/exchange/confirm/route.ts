export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Utilise ton instance prisma globale plutôt qu'en recréer une

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // On extrait les identifiants possibles
    const { transactionId, id, paymentId, reference } = body;
    const identifier = transactionId || id || paymentId || reference;

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifiant manquant (id ou référence requis)" },
        { status: 400 }
      );
    }

    // Tentative de mise à jour par ID (CUID) ou par Référence unique
    // On retire updatedAt car il est géré par @updatedAt dans ton schéma
    try {
      // 1. On essaie d'abord par l'ID primaire (CUID)
      const transaction = await prisma.transaction.update({
        where: { id: identifier },
        data: {
          status: "COMPLETED",
          // updatedAt est géré automatiquement par Prisma ici
        },
      });
      return NextResponse.json({ success: true, data: transaction });
    } catch (error: any) {
      // P2025 = Record not found (si l'ID n'est pas un CUID mais une référence)
      if (error.code === 'P2025') {
        const txByRef = await prisma.transaction.update({
          where: { reference: identifier },
          data: { 
            status: "COMPLETED" 
          }
        });
        return NextResponse.json({ success: true, data: txByRef });
      }
      throw error; // On renvoie l'erreur au catch global si c'est autre chose
    }

  } catch (error: any) {
    console.error("Erreur de confirmation Pimpay:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Transaction introuvable avec cet identifiant" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erreur serveur interne lors de la validation" }, 
      { status: 500 }
    );
  }
}
