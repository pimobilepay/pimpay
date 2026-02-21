export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus } from '@prisma/client';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        // Utilisation de l'Enum correct pour éviter les erreurs de type
        status: TransactionStatus.PENDING,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedData = transactions.map((tx) => {
      const meta = (tx.metadata as any) || {};
      
      // On identifie l'utilisateur (soit celui qui envoie, soit celui qui reçoit)
      const user = tx.fromUser || tx.toUser;

      // Construction du nom complet à partir de ton schéma
      const fullName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
        : (user?.username || "Client PimPay");

      // Logique de récupération du numéro de téléphone (Retraits Mobile Money)
      const withdrawalPhone =
        tx.accountNumber ||           
        meta.phoneNumber ||           
        meta.phone ||                 
        user?.phone ||                  
        "Non spécifié";

      return {
        id: tx.id,
        userId: tx.fromUserId || tx.toUserId || "N/A",
        // Ces champs correspondent maintenant aux interfaces de ton frontend
        fromUser: {
          firstName: user?.firstName || "Utilisateur",
          lastName: user?.lastName || "PimPay"
        },
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        // Information complémentaire pour l'affichage Admin
        method: meta.method || meta.provider || (tx.currency === "PI" ? "PI_NETWORK" : "MOBILE"),
        accountNumber: withdrawalPhone,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("❌ [API_ADMIN_GET_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger les flux critiques" }, { status: 500 });
  }
}
