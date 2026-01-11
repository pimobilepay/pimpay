export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        fromUser: true, 
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedData = transactions.map((tx) => {
      // On récupère l'objet metadata
      const meta = tx.metadata as any;

      // CORRECTION : On cible 'phoneNumber' qui est utilisé dans tes métadonnées (vu sur ta capture)
      const withdrawalPhone = 
        tx.accountNumber ||           // 1. D'abord le numéro de compte direct
        meta?.phoneNumber ||           // 2. Ensuite le phoneNumber dans les metadata (ton cas ici)
        meta?.phone ||                 // 3. Alternativement 'phone'
        tx.fromUser?.phone ||          // 4. En dernier recours le profil
        "Non spécifié";

      return {
        id: tx.id,
        userId: tx.fromUserId || "N/A",
        userName: tx.fromUser?.name || tx.fromUser?.username || "Client",
        amount: tx.amount,
        currency: tx.currency,
        // On récupère la méthode de retrait (mobile, bank, etc.)
        method: meta?.method || meta?.provider || "MOBILE",
        phoneNumber: withdrawalPhone, 
        status: 'pending',
        createdAt: tx.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Erreur API Admin Pimpay:", error);
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
}
