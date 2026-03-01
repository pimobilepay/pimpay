export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> } // On définit params comme une Promise
) {
  try {
    // 1. IL FAUT ATTENDRE LES PARAMS (Correction pour Next.js 15+)
    const resolvedParams = await params;
    const ref = resolvedParams.ref;

    if (!ref) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 2. Recherche de la transaction dans la base de données
    const transaction = await prisma.transaction.findUnique({
      where: { reference: ref },
      include: {
        fromUser: {
          select: {
            name: true,
            avatar: true,
            wallets: true // Pour vérifier le solde après coup
          }
        },
        toUser: {
          select: {
            name: true,
            avatar: true
          }
        },
        // Optionnel : Inclure les infos des wallets impliqués
        fromWallet: true,
        toWallet: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Erreur API Transaction:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
