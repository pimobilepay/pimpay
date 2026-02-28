export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // On accepte 'id' ou 'ref' ou 'txid' pour être compatible avec le frontend
    const txId = searchParams.get("id") || searchParams.get("txid");
    const ref = searchParams.get("ref");

    if (!txId && !ref) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
    }

    // 1. Vérification de la session
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.userId || payload.id) as string;

    // 2. Recherche flexible (par ID ou par Référence)
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: txId || undefined },
          { reference: ref || undefined },
          { externalId: txId || undefined }
        ]
      },
      include: {
        fromUser: {
          select: {
            name: true,
            username: true,
            walletAddress: true,
          }
        },
        toUser: {
          select: {
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

    // 3. Formatage pour le frontend
    const isSender = transaction.fromUserId === userId;

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency, // Crucial pour ta page de succès
      fee: transaction.fee,
      netAmount: transaction.netAmount,
      date: transaction.createdAt, // On envoie la date brute, le JS s'occupera du formatage
      type: transaction.type,
      direction: isSender ? "SEND" : "RECEIVE",
      status: transaction.status,
      
      // Détails des acteurs
      sender: isSender ? "Moi" : (transaction.fromUser?.name || transaction.fromUser?.username || "Pimpay User"),
      recipient: isSender ? (transaction.toUser?.name || transaction.toUser?.username || "Destinataire") : "Moi",
      
      // Adresses
      recipientAddress: transaction.toUser?.walletAddress || transaction.accountNumber || "N/A",
      blockchainTx: transaction.blockchainTx,
      
      description: transaction.description || transaction.purpose || "Transfert Pimpay"
    });

  } catch (error: any) {
    console.error("API_TX_DETAILS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
