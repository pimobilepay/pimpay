import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Import de ton système d'auth

export async function GET() {
  try {
    // 1. Récupérer la session de l'utilisateur
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer les transactions uniquement pour cet utilisateur
    const transactions = await prisma.transaction.findMany({
      where: { 
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        status: true,
        description: true,
      }
    });

    // 3. Formater les données pour le frontend (WalletPage & CardPage)
    const formattedHistory = transactions.map(tx => {
      // Logique pour déterminer si c'est une entrée (IN) ou sortie (OUT)
      let displayType = "OUT";
      if (tx.type === "DEPOSIT" || tx.type === "TRANSFER_IN") {
        displayType = "IN";
      }

      return {
        id: tx.id,
        type: displayType, 
        label: tx.description || tx.type.replace('_', ' '),
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

    // 4. Données dynamiques pour le graphique (Optionnel : On peut les calculer selon l'historique)
    const chart = [
       { name: 'Lun', amount: 20 }, { name: 'Mar', amount: 45 },
       { name: 'Mer', amount: 30 }, { name: 'Jeu', amount: 80 },
       { name: 'Ven', amount: 60 }, { name: 'Sam', amount: 95 },
       { name: 'Dim', amount: 110 }
    ];

    return NextResponse.json({ 
      success: true,
      history: formattedHistory, 
      chart 
    });

  } catch (error) {
    console.error("API_TRANSACTIONS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
