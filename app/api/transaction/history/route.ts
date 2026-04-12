export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // On utilise 'as any' pour bypasser le typage de session si nécessaire
    const session = await auth() as any;

    // CORRECTION : Accès direct à session.id (et non session.user.id)
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ]
      },
      orderBy: { 
        createdAt: 'desc' 
      },
      include: {
        fromUser: { 
          select: { 
            id: true,
            username: true, 
            name: true, 
            avatar: true,
            phone: true,
            email: true
          } 
        },
        toUser: { 
          select: { 
            id: true,
            username: true, 
            name: true, 
            avatar: true,
            phone: true,
            email: true
          } 
        }
      }
    });

    // Format transactions with proper display names
    const formattedTransactions = transactions.map((tx) => {
      // Get display name for fromUser
      let fromDisplayName = "Utilisateur inconnu";
      if (tx.fromUser) {
        fromDisplayName = tx.fromUser.name || tx.fromUser.username || tx.fromUser.phone || tx.fromUser.email?.split('@')[0] || "Utilisateur";
      }
      
      // Get display name for toUser
      let toDisplayName = "Utilisateur inconnu";
      if (tx.toUser) {
        toDisplayName = tx.toUser.name || tx.toUser.username || tx.toUser.phone || tx.toUser.email?.split('@')[0] || "Utilisateur";
      }

      // Check metadata for additional recipient info (for transfers to external addresses or businesses)
      const metadata = tx.metadata as any;
      if (metadata) {
        if (metadata.recipientName) {
          toDisplayName = metadata.recipientName;
        }
        if (metadata.senderName) {
          fromDisplayName = metadata.senderName;
        }
        if (metadata.businessName) {
          if (tx.fromUserId === session.id) {
            toDisplayName = metadata.businessName;
          } else {
            fromDisplayName = metadata.businessName;
          }
        }
        if (metadata.employeeName) {
          toDisplayName = metadata.employeeName;
        }
      }

      // Special handling for blockchain deposits (SIDRA, PI, etc.)
      if (tx.type === "DEPOSIT" && !tx.fromUserId) {
        // Determine the blockchain name based on currency or description
        if (tx.currency === "SDA" || tx.description?.toLowerCase().includes("sidra")) {
          fromDisplayName = "Sidra Chain";
        } else if (tx.currency === "PI" || tx.description?.toLowerCase().includes("pi network")) {
          fromDisplayName = "Pi Network";
        } else if (tx.currency === "XRP") {
          fromDisplayName = "XRP Ledger";
        } else if (tx.currency === "BTC") {
          fromDisplayName = "Bitcoin Network";
        } else if (tx.currency === "ETH") {
          fromDisplayName = "Ethereum Network";
        } else if (tx.currency === "USDT" || tx.currency === "USDC" || tx.currency === "DAI" || tx.currency === "BUSD") {
          fromDisplayName = "Depot Stablecoin";
        } else {
          fromDisplayName = "Depot Blockchain";
        }
      }

      // Special handling for withdrawals
      if (tx.type === "WITHDRAW" && !tx.toUserId) {
        if (tx.currency === "SDA") {
          toDisplayName = "Sidra Chain";
        } else if (tx.currency === "PI") {
          toDisplayName = "Pi Network";
        } else {
          toDisplayName = "Retrait Externe";
        }
      }

      // Special handling for card purchases
      if (tx.type === "CARD_PURCHASE" || tx.reference?.toUpperCase().startsWith("CARD-BUY")) {
        toDisplayName = "Achat Carte PimPay";
      }

      return {
        ...tx,
        fromUser: tx.fromUser ? { ...tx.fromUser, displayName: fromDisplayName } : { displayName: fromDisplayName },
        toUser: tx.toUser ? { ...tx.toUser, displayName: toDisplayName } : { displayName: toDisplayName },
      };
    });

    // Retourne les transactions trouvées
    return NextResponse.json(formattedTransactions);
    
  } catch (error: any) {
    console.error("HISTORY_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de l'historique" }, 
      { status: 500 }
    );
  }
}
