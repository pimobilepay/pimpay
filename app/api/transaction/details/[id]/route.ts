import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        fromUser: { select: { name: true, username: true, avatar: true, walletAddress: true } },
        toUser: { select: { name: true, username: true, avatar: true, walletAddress: true } },
      }
    });

    if (!transaction) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

    // Sécurité : Vérifier que l'utilisateur est soit l'expéditeur, soit le destinataire
    if (transaction.fromUserId !== session.user.id && transaction.toUserId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
