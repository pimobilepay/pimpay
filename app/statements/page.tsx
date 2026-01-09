import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import HistoryClient from "./HistoryClient";

async function getStatementsData() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // Récupération des transactions réelles depuis Prisma
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Calcul des Entrées (Income) et Sorties (Outcome)
    const stats = transactions.reduce((acc, tx) => {
      if (tx.toUserId === userId) {
        acc.income += tx.amount;
      } else {
        acc.outcome += tx.amount;
      }
      return acc;
    }, { income: 0, outcome: 0 });

    return { transactions, stats, userId };
  } catch (error) {
    console.error("Erreur Statements:", error);
    return null;
  }
}

export default async function StatementsPage() {
  const data = await getStatementsData();

  if (!data) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-500 font-bold">
      Session expirée. Veuillez vous reconnecter.
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
