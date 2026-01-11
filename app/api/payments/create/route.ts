export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification de l'authentification (doit être await si verifyAuth est asynchrone)
    const payload = await verifyAuth(req) as any;
    if (!payload) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { amount, memo } = await req.json();

    // 2. Création de la transaction dans Prisma
    // Selon ton schéma : 
    // - Pas de champ 'userId', on utilise 'fromUserId'
    // - Le champ 'reference' est @unique et obligatoire
    const transaction = await prisma.transaction.create({
      data: {
        // Génération d'une référence unique pour respecter la contrainte @unique
        reference: `TX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        amount: parseFloat(amount),
        type: "PAYMENT",
        status: "PENDING",
        fromUserId: payload.id, // Utilisation du champ correct selon ton schéma
        description: memo || "Transfert Pi Network",
        currency: "PI", // Valeur par défaut dans ton schéma, mais explicite ici
      },
    });

    return NextResponse.json({
      orderId: transaction.id,
      amount: transaction.amount,
      reference: transaction.reference
    });
  } catch (error: any) {
    console.error("Erreur Transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
