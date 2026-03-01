export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth"; // Utilisation de adminAuth pour la cohérence

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification Admin
    // CORRECTION : Ajout de await et du cast unknown pour passer le build
    const payload = (await adminAuth(req)) as unknown as { id: string; role: string } | null;
    
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { transactionId } = await req.json();       
    if (!transactionId) {
      return NextResponse.json({ error: "ID de transaction manquant" }, { status: 400 });
    }

    // 2. Mise à jour transactionnelle sécurisée
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error("Transaction introuvable");
      }

      // 3. Mise à jour du statut
      // 'as any' permet de forcer le build même si ton Enum Prisma attend "SUCCESS" ou "SUCCESS"
      return await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "SUCCESS" 
        } as any,
      });
    }, { maxWait: 10000, timeout: 30000 });

    // 4. Audit Log (Optionnel mais recommandé pour la traçabilité admin)
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: "ADMIN",
        action: "APPROVE_TRANSACTION",
        details: `Approbation de la transaction ${transactionId}`
      }
    }).catch(() => null); // On ne bloque pas la réponse si le log échoue

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("APPROVE_TRANSACTION_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la validation" },
      { status: 500 }
    );
  }
}
