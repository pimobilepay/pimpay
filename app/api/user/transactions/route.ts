import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Ton système d'auth (Clerk, Auth.js, etc.)

export async function GET() {
  try {
    // 1. Récupérer la session de l'utilisateur
    const session = await auth();
    const userId = session?.user?.id;

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
      take: 20, // On en prend un peu plus pour l'historique complet
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        status: true,
        description: true,
        reference: true,
        fromUserId: true,
        toUserId: true,
      }
    });

    // 3. Formater les données pour le frontend
    const formattedHistory = transactions.map(tx => {
      // Déterminer si l'argent entre ou sort pour l'utilisateur actuel
      let displayDirection = "OUT";
      
      if (tx.type === "DEPOSIT") displayDirection = "IN";
      if (tx.type === "TRANSFER" && tx.toUserId === userId) displayDirection = "IN";
      if (tx.type === "SWAP") displayDirection = "SWAP"; // Cas particulier pour les échanges

      return {
        id: tx.id,
        type: tx.type, // Type brut Prisma (DEPOSIT, SWAP, etc.)
        direction: displayDirection, // Pour le style CSS (Vert/Blanc)
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

    // 4. Calculer dynamiquement les données du graphique (7 derniers jours)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dateStr: d.toISOString().split('T')[0],
        amount: 0
      };
    }).reverse();

    // Remplir le graphique avec les montants réels (somme par jour)
    transactions.forEach(tx => {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.dateStr === txDate);
      if (dayData) {
        dayData.amount += Number(tx.amount);
      }
    });

    // Nettoyer les données pour Recharts
    const chart = last7Days.map(d => ({ name: d.name, amount: d.amount }));

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      chart
    });

  } catch (error) {
    console.error("API_TRANSACTIONS_ERROR:", error);
    return NextResponse.json({ 
      error: "Erreur serveur",
      success: false 
    }, { status: 500 });
  }
}
