export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth() as any;

    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        fromUser: { 
          select: { 
            id: true,
            name: true, 
            username: true, 
            avatar: true, 
            walletAddress: true,
            phone: true,
            email: true
          } 
        },
        toUser: { 
          select: { 
            id: true,
            name: true, 
            username: true, 
            avatar: true, 
            walletAddress: true,
            phone: true,
            email: true
          } 
        },
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction introuvable" }, { status: 404 });
    }

    const isSender = transaction.fromUserId === session.id;
    const isReceiver = transaction.toUserId === session.id;
    const isAdmin = session.role === "ADMIN";

    if (!isSender && !isReceiver && !isAdmin) {
      return NextResponse.json({ success: false, error: "Acces refuse" }, { status: 403 });
    }

    // Get display names
    let fromDisplayName = "Utilisateur inconnu";
    if (transaction.fromUser) {
      fromDisplayName = transaction.fromUser.name || transaction.fromUser.username || transaction.fromUser.phone || transaction.fromUser.email?.split('@')[0] || "Utilisateur";
    }

    let toDisplayName = "Utilisateur inconnu";
    if (transaction.toUser) {
      toDisplayName = transaction.toUser.name || transaction.toUser.username || transaction.toUser.phone || transaction.toUser.email?.split('@')[0] || "Utilisateur";
    }

    // Check metadata for additional info
    const metadata = transaction.metadata as any;
    if (metadata) {
      if (metadata.recipientName) toDisplayName = metadata.recipientName;
      if (metadata.senderName) fromDisplayName = metadata.senderName;
      if (metadata.businessName) {
        if (transaction.fromUserId === session.id) {
          toDisplayName = metadata.businessName;
        } else {
          fromDisplayName = metadata.businessName;
        }
      }
      if (metadata.employeeName) toDisplayName = metadata.employeeName;
    }

    // Special handling for card purchases
    if (transaction.type === "CARD_PURCHASE" || transaction.reference?.toUpperCase().startsWith("CARD-BUY")) {
      toDisplayName = "Achat Carte PimPay";
    }

    // Special handling for deposits
    if (transaction.type === "DEPOSIT" && !transaction.fromUserId) {
      if (transaction.currency === "PI") {
        fromDisplayName = "Pi Network";
      } else if (transaction.currency === "SDA") {
        fromDisplayName = "Sidra Chain";
      } else {
        fromDisplayName = "Depot Blockchain";
      }
    }

    // Special handling for withdrawals
    if (transaction.type === "WITHDRAW" && !transaction.toUserId) {
      toDisplayName = "Retrait Externe";
    }

    const formattedTransaction = {
      ...transaction,
      fromUser: transaction.fromUser 
        ? { ...transaction.fromUser, displayName: fromDisplayName } 
        : { displayName: fromDisplayName },
      toUser: transaction.toUser 
        ? { ...transaction.toUser, displayName: toDisplayName } 
        : { displayName: toDisplayName },
    };

    return NextResponse.json({ success: true, transaction: formattedTransaction });
  } catch (error: any) {
    console.error("TRANSACTION_DETAILS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
