import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function GET(req: Request) {
  try {
    const token = cookies().get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // Récupérer les 20 dernières transactions pour avoir de la marge
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // On en prend un peu plus pour filtrer
    });

    // OPTIONNEL : Filtrage par "Hash" ou "Reference" si tu as ces champs
    // Cela évite d'afficher deux fois la même opération si le système a buggé
    const uniqueTransactions = transactions.filter((v, i, a) => 
      a.findIndex(t => t.id === v.id) === i
    );

    return NextResponse.json({ 
      transactions: uniqueTransactions.slice(0, 10) 
    });

  } catch (error: any) {
    console.error("Erreur API Transactions:", error.message);
    return NextResponse.json({ error: "Erreur lors de la récupération des transactions" }, { status: 500 });
  }
}
