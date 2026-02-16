import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST(request: Request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🚀 [PI-APPROVE] Début de l'approbation du paiement...`);

  try {
    const body = await request.json();
    const { paymentId, amount } = body;

    // 1. Récupération de la session utilisateur via le token JWT
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      console.error(`[${timestamp}] ❌ [AUTH] Aucun token trouvé dans les cookies.`);
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Décodage du token pour avoir l'ID de l'utilisateur
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    console.log(`[${timestamp}] 📥 [LOG] Paiement ${paymentId} pour l'utilisateur ${userId}`);

    // 2. Vérification de l'existence du Wallet Pi de l'utilisateur
    const userWallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: userId,
          currency: "PI",
        },
      },
    });

    if (!userWallet) {
      console.error(`[${timestamp}] ❌ [WALLET] Wallet PI introuvable pour cet utilisateur.`);
      return NextResponse.json({ error: "Portefeuille PI introuvable" }, { status: 404 });
    }

    // 3. Création de la transaction dans la base de données Pimpay
    // On utilise 'toUserId' et 'toWalletId' car c'est un dépôt (l'argent arrive)
    console.log(`[${timestamp}] 🔄 [DB] Création de la transaction PENDING...`);
    
    const transaction = await prisma.transaction.create({
      data: {
        reference: `DEP-PI-${paymentId.slice(-8)}-${Math.random().toString(36).substring(7)}`,
        externalId: paymentId, // On stocke le paymentId de Pi ici pour le retrouver plus tard
        amount: parseFloat(amount),
        type: "DEPOSIT",
        status: "PENDING",
        currency: "PI",
        toUserId: userId,
        toWalletId: userWallet.id,
        description: "Dépôt via Pi Network SDK",
        metadata: {
          paymentId: paymentId,
          source: "PiBrowser",
          initiatedAt: new Date().toISOString()
        }
      },
    });

    console.log(`[${timestamp}] ✅ [SUCCESS] Transaction ${transaction.reference} créée. Prêt pour approbation Pi.`);

    // 4. Réponse au Pi SDK pour qu'il continue le processus
    return NextResponse.json({
      success: true,
      message: "Payment approved on Pimpay server",
      transactionId: transaction.id
    });

  } catch (error: any) {
    console.error(`[${timestamp}] 💥 [CRITICAL] Erreur Approve:`, error.message);
    return NextResponse.json(
      { error: "Erreur lors de l'approbation", details: error.message },
      { status: 500 }
    );
  }
}
