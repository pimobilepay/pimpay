import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = "force-dynamic";

interface AdminNotification {
  id: string;
  type: "KYC_PENDING" | "TRANSACTION_PENDING" | "NEW_USER" | "SUPPORT_TICKET" | "WITHDRAWAL_PENDING" | "MESSAGE" | "ALERT";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export async function GET() {
  try {
    const notifications: AdminNotification[] = [];
    const last24h = subHours(new Date(), 24);

    // 1. KYC en attente
    const pendingKyc = await prisma.user.findMany({
      where: { 
        kycStatus: "PENDING",
        kycSubmittedAt: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        kycSubmittedAt: true,
      },
      orderBy: { kycSubmittedAt: "desc" },
      take: 20,
    });

    pendingKyc.forEach((user) => {
      notifications.push({
        id: `kyc-${user.id}`,
        type: "KYC_PENDING",
        title: "KYC en attente",
        message: `${user.firstName || ""} ${user.lastName || ""} (@${user.username}) attend une verification KYC`,
        priority: "high",
        read: false,
        createdAt: user.kycSubmittedAt || new Date(),
        metadata: { userId: user.id, username: user.username },
      });
    });

    // 2. Transactions en attente de validation
    const pendingTransactions = await prisma.transaction.findMany({
      where: { 
        status: "PENDING",
        type: { in: ["WITHDRAW", "TRANSFER", "EXTERNAL_TRANSFER"] },
      },
      include: {
        fromUser: { select: { firstName: true, lastName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    pendingTransactions.forEach((tx) => {
      const userName = tx.fromUser 
        ? `${tx.fromUser.firstName || ""} ${tx.fromUser.lastName || ""}`.trim() || tx.fromUser.username
        : "Utilisateur";
      
      notifications.push({
        id: `tx-${tx.id}`,
        type: "TRANSACTION_PENDING",
        title: tx.type === "WITHDRAW" ? "Retrait en attente" : "Transaction en attente",
        message: `${userName} - ${tx.amount.toFixed(8)} ${tx.currency}`,
        priority: tx.amount > 1000 ? "urgent" : "high",
        read: false,
        createdAt: tx.createdAt,
        metadata: { transactionId: tx.id, amount: tx.amount, currency: tx.currency },
      });
    });

    // 3. Nouveaux utilisateurs (dernieres 24h)
    const newUsers = await prisma.user.findMany({
      where: { 
        createdAt: { gte: last24h }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    newUsers.forEach((user) => {
      notifications.push({
        id: `user-${user.id}`,
        type: "NEW_USER",
        title: "Nouvel utilisateur",
        message: `${user.firstName || ""} ${user.lastName || ""} (@${user.username}) vient de s'inscrire`,
        priority: "low",
        read: false,
        createdAt: user.createdAt,
        metadata: { userId: user.id, username: user.username },
      });
    });

    // 4. Tickets de support non resolus
    const supportTickets = await prisma.supportTicket.findMany({
      where: { 
        status: { in: ["OPEN", "IN_PROGRESS"] }
      },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    supportTickets.forEach((ticket) => {
      const userName = ticket.user 
        ? `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim() || ticket.user.username
        : "Utilisateur";
      
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: "SUPPORT_TICKET",
        title: ticket.status === "OPEN" ? "Nouveau ticket support" : "Ticket en cours",
        message: `${userName}: ${ticket.subject?.substring(0, 50) || "Demande de support"}...`,
        priority: ticket.status === "OPEN" ? "medium" : "low",
        read: false,
        createdAt: ticket.createdAt,
        metadata: { ticketId: ticket.id, subject: ticket.subject },
      });
    });

    // 5. Messages admin non lus (if AdminMessage table exists)
    let unreadMessages: any[] = [];
    try {
      // Try to fetch admin messages - table may not exist in all deployments
      const msgResult = await prisma.$queryRaw<any[]>`
        SELECT id, content, read, "createdAt", "senderId"
        FROM "AdminMessage" 
        WHERE read = false 
        ORDER BY "createdAt" DESC 
        LIMIT 10
      `;
      unreadMessages = msgResult || [];
    } catch {
      // Table doesn't exist, skip
    }

    unreadMessages.forEach((msg: any) => {
      notifications.push({
        id: `msg-${msg.id}`,
        type: "MESSAGE",
        title: "Nouveau message",
        message: `Message admin: ${msg.content?.substring(0, 50) || "Message"}...`,
        priority: "medium",
        read: false,
        createdAt: msg.createdAt,
        metadata: { messageId: msg.id },
      });
    });

    // Trier par date (plus recent en premier) et par priorite
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => {
      // D'abord par priorite
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Puis par date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculer les compteurs
    const unreadCount = notifications.filter(n => !n.read).length;
    const urgentCount = notifications.filter(n => n.priority === "urgent" || n.priority === "high").length;

    // Formater les dates
    const formattedNotifications = notifications.map(n => ({
      ...n,
      timeAgo: formatDistanceToNow(n.createdAt, { addSuffix: true, locale: fr }),
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      urgentCount,
      counts: {
        kyc: pendingKyc.length,
        transactions: pendingTransactions.length,
        users: newUsers.length,
        tickets: supportTickets.length,
        messages: unreadMessages.length,
      },
    });

  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_ERROR]", error);
    return NextResponse.json({ 
      notifications: [],
      unreadCount: 0,
      urgentCount: 0,
      counts: { kyc: 0, transactions: 0, users: 0, tickets: 0, messages: 0 }
    });
  }
}
