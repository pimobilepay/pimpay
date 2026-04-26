export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus } from '@prisma/client';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        // Include both PENDING and PENDING_CONFIRMATION transactions
        status: {
          in: [TransactionStatus.PENDING, TransactionStatus.PENDING_CONFIRMATION]
        },
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
      const transferDetails = meta.transferDetails || {};
      
      // On identifie l'utilisateur (soit celui qui envoie, soit celui qui reçoit)
      const user = tx.fromUser || tx.toUser;

      // Construction du nom complet à partir de ton schéma
      const fullName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
        : (user?.username || "Client PimPay");

      // Logique de détection du type de retrait
      // Retrait blockchain externe = a une adresse externe dans metadata
      const isBlockchainWithdraw = meta.isBlockchainWithdraw === true || 
                                   meta.isExternal === true ||
                                   Boolean(meta.externalAddress);
      
      // Retrait mobile money = a des détails téléphoniques
      const isMobileWithdraw = meta.method === "mobile" || 
                               Boolean(transferDetails?.phone) || 
                               Boolean(transferDetails?.provider);
      
      // Retrait bancaire
      const isBankWithdraw = meta.method === "bank" || 
                             Boolean(transferDetails?.bankName) ||
                             Boolean(transferDetails?.accountNumber);

      // Récupération de l'adresse/identifiant de destination
      // Priorité:
      // 1. Adresse blockchain externe (pour Pi Network, crypto, etc.)
      // 2. IBAN/Compte bancaire
      // 3. Numéro de téléphone Mobile Money (format: +indicatif + numéro)
      // 4. accountNumber en DB
      // 5. "Non spécifié" (jamais le téléphone du user!)
      let accountIdentifier = "Non spécifié";
      
      if (isBlockchainWithdraw) {
        // Pour les retraits blockchain: utiliser l'adresse externe stockée dans metadata OU dans accountNumber
        accountIdentifier = meta.externalAddress || meta.destination || tx.accountNumber || "Adresse en attente";
      } else if (isBankWithdraw) {
        // Pour les virements bancaires: IBAN ou numéro de compte
        accountIdentifier = transferDetails?.accountNumber || 
                           transferDetails?.iban || 
                           tx.accountNumber || 
                           "Compte bancaire";
      } else if (isMobileWithdraw) {
        // Pour Mobile Money: numéro de téléphone du bénéficiaire (pas du user!)
        accountIdentifier = transferDetails?.phone || 
                           meta.phoneNumber || 
                           meta.phone || 
                           tx.accountNumber ||
                           "Mobile Money";
      } else {
        // Fallback pour autres types
        accountIdentifier = tx.accountNumber || 
                           meta.destination || 
                           "Non spécifié";
      }

      // Méthode de transfert
      let transferMethod = "TRANSFER";
      
      if (isBlockchainWithdraw) {
        // Pour blockchain: afficher le réseau (PI, XLM, SOL, etc.)
        transferMethod = meta.network || tx.currency || "BLOCKCHAIN";
      } else if (isMobileWithdraw) {
        // Pour mobile: afficher l'opérateur
        transferMethod = transferDetails?.provider || meta.provider || "MOBILE_MONEY";
      } else if (isBankWithdraw) {
        // Pour banque: afficher le nom de la banque
        transferMethod = transferDetails?.bankName || meta.bankName || "BANK_TRANSFER";
      } else {
        transferMethod = meta.method || (tx.currency === "PI" ? "PI_INTERNAL" : tx.type);
      }

      return {
        id: tx.id,
        userId: tx.fromUserId || tx.toUserId || "N/A",
        fromUser: {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          username: (user as any)?.username || "",
          email: (user as any)?.email || "",
        },
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        method: transferMethod,
        accountNumber: accountIdentifier,
        isBlockchainWithdraw: isBlockchainWithdraw,
        isMobileWithdraw: isMobileWithdraw,
        isBankWithdraw: isBankWithdraw,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        description: tx.description || null,
        blockchainTx: tx.blockchainTx || null,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("❌ [API_ADMIN_GET_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger les flux critiques" }, { status: 500 });
  }
}
