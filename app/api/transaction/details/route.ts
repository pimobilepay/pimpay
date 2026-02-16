export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txId = searchParams.get("id");

    if (!txId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // 1. Vérification de la session
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.userId || payload.id) as string;

    // 2. Récupération avec les relations exactes du schéma Pimpay
    const transaction = await prisma.transaction.findUnique({
      where: { id: txId },
      include: {
        fromUser: { 
          select: { 
            name: true, 
            username: true,
            walletAddress: true, // Champ direct sur User
            wallets: { select: { currency: true, balance: true } } // Relation plurielle
          } 
        },
        toUser: { 
          select: { 
            name: true, 
            username: true,
            walletAddress: true, // Champ direct sur User
            wallets: { select: { currency: true, balance: true } } // Relation plurielle
          } 
        },
      }
    });

    if (!transaction) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 3. Formatage pour le frontend
    const isSender = transaction.fromUserId === userId;

    return NextResponse.json({
      reference: transaction.reference,
      amount: transaction.amount,
      fee: transaction.fee || 0.01,
      date: new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date(transaction.createdAt)),
      type: isSender ? "SEND" : "RECEIVE",
      status: transaction.status,
      // Fallback sur username si name est vide
      sender: isSender ? "Moi" : (transaction.fromUser?.name || transaction.fromUser?.username || "Anonyme"),
      recipient: isSender ? (transaction.toUser?.name || transaction.toUser?.username || "Destinataire") : "Moi",
      // Utilisation du champ walletAddress défini dans ton modèle User
      recipientAddress: transaction.toUser?.walletAddress || "N/A",
      description: transaction.description || transaction.note
    });

  } catch (error: any) {
    console.error("API_TX_DETAILS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
