import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid"; // Importation de NanoID

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION ROBUSTE
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_id")?.value;
    const authHeader = request.headers.get("authorization")?.split(" ")[1];
    
    // Priorité au Header si présent, sinon Cookie
    const token = authHeader || sessionToken;

    if (!token) {
      return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });
    }

    let senderId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(token, secret);
      senderId = payload.userId as string;
    } catch (jwtError) {
      // Si le token est invalide ou expiré (JWT expired)
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }

    // 2. RÉCUPÉRATION ET VALIDATION DES DONNÉES
    const { amount, recipientId, description } = await request.json();
    const numericAmount = parseFloat(amount);

    if (!recipientId || isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Montant ou destinataire invalide" }, { status: 400 });
    }

    if (recipientId === senderId) {
      return NextResponse.json({ error: "Impossible de s'envoyer des Pi à soi-même" }, { status: 400 });
    }

    // GÉNÉRATION DES IDS MODÈLE 2 (NanoID)
    const txId = nanoid(12); // L'ID pour la DB
    const txRef = `PMP-TX-${nanoid(8).toUpperCase()}`; // La référence pour l'utilisateur

    // 3. TRANSACTION PRISMA (ATOMICITÉ)
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier et débiter l'envoyeur
      // On utilise 'update' avec une condition pour garantir que le solde ne devient pas négatif
      const senderWallet = await tx.wallet.update({
        where: { userId_currency: { userId: senderId, currency: "PI" } },
        data: { balance: { decrement: numericAmount } }
      });

      if (senderWallet.balance < 0) {
        throw new Error("Solde insuffisant pour cette opération");
      }

      // Créditer le destinataire
      const recipientWallet = await tx.wallet.update({
        where: { userId_currency: { userId: recipientId, currency: "PI" } },
        data: { balance: { increment: numericAmount } }
      });

      // Créer l'entrée d'historique avec NanoID
      return await tx.transaction.create({
        data: {
          id: txId, // Utilisation de ton nouveau modèle ID
          reference: txRef,
          amount: numericAmount,
          type: "TRANSFER",
          status: "SUCCESS",
          description: description || "Transfert Pi Network",
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          toUserId: recipientId,
          toWalletId: recipientWallet.id,
          netAmount: numericAmount
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: "Transfert effectué", 
      id: txId, // On renvoie le NanoID pour la redirection vers les détails
      reference: txRef 
    });

  } catch (error: any) {
    console.error("Erreur API Send:", error.message);
    
    // Gestion spécifique des erreurs Prisma (ex: destinataire inexistant)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Le portefeuille du destinataire est introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      error: error.message === "Solde insuffisant pour cette opération"
        ? error.message
        : "Échec de la transaction sécurisée"
    }, { status: 400 });
  }
}
