import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import HistoryClient from "./HistoryClient";

async function getStatementsData() {
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {

    // Récupération des transactions avec les détails nécessaires
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phone: true,
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phone: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Calcul enrichi des statistiques
    const stats = transactions.reduce((acc, tx) => {
      if (tx.toUserId === userId) {
        acc.income += tx.amount;
      }
      else if (tx.fromUserId === userId) {
        acc.outcome += tx.amount;
        if (tx.fee) acc.totalFees += tx.fee;
      }
      return acc;
    }, { income: 0, outcome: 0, totalFees: 0 });

    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      displayMetadata: tx.metadata as any
    }));

    return { transactions: formattedTransactions, stats, userId };
  } catch (error) {
    console.error("Erreur Statements (Pimpay):", error);
    return null;
  }
}

export default async function StatementsPage() {
  const data = await getStatementsData();

  if (!data) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-500 font-black uppercase tracking-widest italic">
      Session expirée sur le protocole.
    </div>
  );

  return (
    <HistoryClient
      initialTransactions={data.transactions}
      stats={data.stats}
      currentUserId={data.userId}
    />
  );
}
