import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        status: true,
      }
    });

    const formattedHistory = transactions.map(tx => ({
      id: tx.id,
      type: tx.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAW", // Mapping pour ton frontend
      amount: tx.amount,
      date: new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      status: tx.status
    }));

    // Simulation de données pour le graphique basé sur les transactions
    const chart = [
       { day: 'Lun', amount: 20 }, { day: 'Mar', amount: 40 }, 
       { day: 'Mer', amount: 35 }, { day: 'Jeu', amount: 50 },
       { day: 'Ven', amount: 70 }, { day: 'Sam', amount: 65 }, 
       { day: 'Dim', amount: 80 }
    ];

    return NextResponse.json({ history: formattedHistory, chart });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
