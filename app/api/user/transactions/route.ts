export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Récupérer la session (Correction de l'accès à l'ID)
    const session = await auth() as any;
    const userId = session?.id; // Dans ton projet, l'ID est à la racine

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer les transactions liées à l'utilisateur
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // On en prend suffisamment pour le graphique et la liste
    });

    // 3. Formater les données pour le frontend (WalletPage)
    const formattedHistory = transactions.map(tx => {
      // Déterminer la direction par rapport à l'utilisateur connecté
      let displayDirection = "OUT";
      
      // Si c'est un dépôt ou si l'utilisateur est le destinataire d'un transfert
      if (tx.type === "DEPOSIT" || (tx.type === "TRANSFER" && tx.toUserId === userId)) {
        displayDirection = "IN";
      } else if (tx.type === "EXCHANGE") {
        displayDirection = "SWAP";
      }

      return {
        id: tx.id,
        type: tx.type,
        direction: displayDirection,
        label: tx.description || tx.type.replace('_', ' '),
        reference: tx.reference,
        amount: tx.amount,
        date: new Date(tx.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: tx.status
      };
    });

    // 4. Calculer les données du graphique (7 derniers jours)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dateStr: d.toISOString().split('T')[0],
        total: 0
      };
    }).reverse();

    // Remplir le graphique
    transactions.forEach(tx => {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.dateStr === txDate);
      if (dayData) {
        // On n'ajoute au graphique que ce qui "entre" ou le volume total selon ton choix
        // Ici, on affiche le volume d'activité (somme absolue)
        dayData.total += tx.amount;
      }
    });

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      chart: last7Days.map(d => ({ name: d.name, amount: d.total }))
    });

  } catch (error: any) {
    console.error("API_TRANSACTIONS_ERROR:", error.message);
    return NextResponse.json({
      error: "Erreur serveur",
      success: false
    }, { status: 500 });
  }
}
