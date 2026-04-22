export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // On récupère les identifiants
    const txId = searchParams.get("id") || searchParams.get("txid") || "";
    const ref = searchParams.get("ref") || "";

    if (!txId && !ref) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
    }

    // 1. Vérification de la session
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Recherche flexible sécurisée
    // On construit l'objet OR dynamiquement pour éviter de passer des strings vides à Prisma
    const searchConditions = [];
    if (txId) {
      searchConditions.push({ id: txId });
      searchConditions.push({ externalId: txId });
    }
    if (ref) {
      searchConditions.push({ reference: ref });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: searchConditions
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            username: true,
            walletAddress: true,
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            username: true,
            walletAddress: true,
          }
        },
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 3. Formatage intelligent pour Pimpay
    const isSender = transaction.fromUserId === userId;

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency, 
      fee: transaction.fee,
      netAmount: transaction.netAmount || (transaction.amount - transaction.fee),
      date: transaction.createdAt,
      type: transaction.type,
      direction: isSender ? "SEND" : "RECEIVE",
      status: transaction.status,

      // Gestion des noms (Priorité Name > Username > Phone)
      sender: isSender ? "Moi" : (transaction.fromUser?.name || transaction.fromUser?.username || "Utilisateur Pimpay"),
      recipient: isSender ? (transaction.toUser?.name || transaction.toUser?.username || "Destinataire") : "Moi",

      // Adresses et Réseaux
      recipientAddress: transaction.toUser?.walletAddress || transaction.accountNumber || "Interne",
      blockchainTx: transaction.blockchainTx,
      
      // Métadonnées
      description: transaction.description || transaction.purpose || "Transfert PimPay",
      note: transaction.note
    });

  } catch (error: any) {
    console.error("API_TX_DETAILS_ERROR:", error);
    // Gestion spécifique pour les erreurs de token (JWT expiré, etc.)
    if (error.code === "ERR_JWT_EXPIRED") {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
