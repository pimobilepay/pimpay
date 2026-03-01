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

      // Logique de récupération de l'identifiant de destination
      // Pour les retraits blockchain, on utilise l'adresse externe du metadata
      const isBlockchainWithdraw = meta.isBlockchainWithdraw === true || meta.isExternal === true;
      const externalAddress = meta.externalAddress || meta.destination || null;

      // Priorité : adresse blockchain > accountNumber en DB > téléphone
      const accountIdentifier = isBlockchainWithdraw && externalAddress
        ? externalAddress
        : tx.accountNumber || meta.phoneNumber || meta.phone || user?.phone || "Non spécifié";

      // Méthode de transfert
      const transferMethod = isBlockchainWithdraw
        ? (meta.network || tx.currency || "BLOCKCHAIN")
        : (meta.method || meta.provider || (tx.currency === "PI" ? "PI_NETWORK" : "MOBILE"));

      return {
        id: tx.id,
        userId: tx.fromUserId || tx.toUserId || "N/A",
        fromUser: {
          firstName: user?.firstName || "Utilisateur",
          lastName: user?.lastName || "PimPay"
        },
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        method: transferMethod,
        accountNumber: accountIdentifier,
        isBlockchainWithdraw: isBlockchainWithdraw,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        description: tx.description || null,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("❌ [API_ADMIN_GET_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger les flux critiques" }, { status: 500 });
  }
}
