import { prisma } from "@/lib/prisma";

type NotificationType = "info" | "success" | "warning" | "error" | "SECURITY" | "PAYMENT_RECEIVED" | "PAYMENT_SENT" | "MERCHANT" | "LOGIN" | "SYSTEM" | "SWAP" | "SUCCESS" | "SALARY";

interface NotificationMetadata {
  // Transaction metadata
  amount?: number;
  currency?: string;
  fee?: number;
  reference?: string;
  transactionId?: string;
  status?: string;
  method?: string;
  // Sender/Recipient
  senderName?: string;
  senderUsername?: string;
  recipientName?: string;
  recipientUsername?: string;
  walletAddress?: string;
  network?: string;
  // Swap metadata
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: number;
  toAmount?: number;
  rate?: number;
  // Session metadata
  device?: string;
  ip?: string;
  location?: string;
  os?: string;
  browser?: string;
}

interface SendNotificationProps {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: NotificationMetadata;
}

/**
 * Envoie une notification à un utilisateur et la persiste en base de données.
 * Utilisable dans les Server Actions ou les API Routes.
 */
export async function sendNotification({
  userId,
  title,
  message,
  type = "info",
  metadata,
}: SendNotificationProps) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
    return notification;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
    return null;
  }
}

/**
 * Fonction utilitaire pour creer une notification de transaction
 */
export async function createTransactionNotification({
  userId,
  type,
  amount,
  currency,
  senderName,
  recipientName,
  reference,
  fee,
  method,
  walletAddress,
}: {
  userId: string;
  type: "DEPOSIT" | "WITHDRAW" | "TRANSFER_SENT" | "TRANSFER_RECEIVED";
  amount: number;
  currency: string;
  senderName?: string;
  recipientName?: string;
  reference?: string;
  fee?: number;
  method?: string;
  walletAddress?: string;
}) {
  const titles: Record<string, string> = {
    DEPOSIT: "Depot recu !",
    WITHDRAW: "Retrait effectue !",
    TRANSFER_SENT: "Transfert envoye !",
    TRANSFER_RECEIVED: "Paiement recu !",
  };

  const messages: Record<string, string> = {
    DEPOSIT: `Vous avez recu un depot de ${amount.toLocaleString()} ${currency}.`,
    WITHDRAW: `Retrait de ${amount.toLocaleString()} ${currency} effectue avec succes.`,
    TRANSFER_SENT: `Vous avez envoye ${amount.toLocaleString()} ${currency} a ${recipientName || "un utilisateur"}.`,
    TRANSFER_RECEIVED: `Vous avez recu ${amount.toLocaleString()} ${currency} de ${senderName || "un utilisateur"}.`,
  };

  const notifTypes: Record<string, NotificationType> = {
    DEPOSIT: "SUCCESS",
    WITHDRAW: "PAYMENT_SENT",
    TRANSFER_SENT: "PAYMENT_SENT",
    TRANSFER_RECEIVED: "PAYMENT_RECEIVED",
  };

  return sendNotification({
    userId,
    title: titles[type],
    message: messages[type],
    type: notifTypes[type],
    metadata: {
      amount,
      currency,
      fee,
      reference,
      method,
      senderName,
      recipientName,
      walletAddress,
      status: "SUCCESS",
    },
  });
}
