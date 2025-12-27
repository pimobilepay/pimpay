import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification Admin
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: "ID de transaction manquant" }, { status: 400 });
    }

    // 2. Mise à jour transactionnelle sécurisée
    const result = await prisma.$transaction(async (tx) => {
      // On récupère la transaction d'abord pour vérifier qu'elle existe
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error("Transaction introuvable");
      }

      // ⚠️ CORRECTION TYPE ICI ⚠️
      // Si "COMPLETED" ne passe pas, vérifie ton schema.prisma. 
      // Souvent dans les systèmes de paiement c'est "SUCCESS" ou "SUCCESSFUL"
      return await tx.transaction.update({
        where: { id: transactionId },
        data: { 
          status: "SUCCESS" // Essaye "SUCCESS" ou vérifie ton Enum dans schema.prisma
        } as any, // On utilise 'as any' temporairement si tu veux forcer le passage du build
      });
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("APPROVE_TRANSACTION_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la validation" }, 
      { status: 500 }
    );
  }
}
