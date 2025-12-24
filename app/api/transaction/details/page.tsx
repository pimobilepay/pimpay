import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txId = searchParams.get("id");

    if (!txId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // Vérification de la session
    const cookieStore = await cookies();
    const token = cookieStore.get("session_id")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // Récupération de la transaction avec les infos de l'expéditeur et du destinataire
    const transaction = await prisma.transaction.findUnique({
      where: { id: txId },
      include: {
        fromUser: { select: { name: true, wallet: { select: { address: true } } } },
        toUser: { select: { name: true, wallet: { select: { address: true } } } },
      }
    });

    if (!transaction) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Formatage pour le frontend
    const isSender = transaction.fromUserId === userId;

    return NextResponse.json({
      reference: transaction.reference,
      amount: transaction.amount,
      fee: 0.01,
      date: new Intl.DateTimeFormat('fr-FR', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      }).format(transaction.createdAt),
      type: isSender ? "SEND" : "RECEIVE",
      status: transaction.status,
      sender: isSender ? "Moi" : transaction.fromUser?.name,
      recipient: isSender ? transaction.toUser?.name : "Moi",
      recipientAddress: transaction.toUser?.wallet[0]?.address || "N/A",
      description: transaction.description
    });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
