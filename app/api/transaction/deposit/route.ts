export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification de l'utilisateur
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. Récupération des données du formulaire
    const body = await req.json();
    const { txHash, provider } = body;

    if (!txHash) {
      return NextResponse.json({ error: "Le Hash de transaction est requis" }, { status: 400 });
    }

    // 3. Vérifier si ce Hash n'a pas déjà été utilisé (sécurité anti-doublon)
    const existingTx = await prisma.transaction.findFirst({
      where: { 
        metadata: {
          path: ['txHash'],
          equals: txHash
        }
      }
    });

    if (existingTx) {
      return NextResponse.json({ error: "Cette transaction a déjà été soumise" }, { status: 400 });
    }

    // 4. Récupérer le wallet de l'utilisateur pour lier la transaction
    const userWallet = await prisma.wallet.findFirst({
      where: { userId: userId, currency: "PI" }
    });

    if (!userWallet) {
      return NextResponse.json({ error: "Portefeuille introuvable" }, { status: 404 });
    }

    // 5. Créer la transaction avec le statut PENDING
    const deposit = await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        reference: `DEP-${Date.now()}`.toUpperCase(),
        amount: 0, // On met 0 car l'admin confirmera le montant réel reçu sur la blockchain
        type: "DEPOSIT",
        status: "PENDING",
        fromUserId: userId,
        fromWalletId: userWallet.id,
        description: `Dépôt Crypto (${provider})`,
        metadata: {
          txHash: txHash,
          provider: provider,
          submittedAt: new Date().toISOString()
        }
      }
    });

    // 6. Optionnel : Créer une notification pour l'utilisateur
    await prisma.notification.create({
      data: {
        userId: userId,
        title: "Dépôt en cours d'examen",
        message: "Votre preuve de dépôt a été reçue. Nous validons votre transfert sur la blockchain.",
        type: "INFO"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Demande soumise",
      id: deposit.id 
    });

  } catch (error: any) {
    console.error("DEPOSIT_API_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du dépôt" }, { status: 500 });
  }
}
