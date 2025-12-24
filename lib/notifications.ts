import { prisma } from "@/lib/prisma";

type NotificationType = "info" | "success" | "warning" | "error";

interface SendNotificationProps {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
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
}: SendNotificationProps) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false,
      },
    });
    return notification;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
    return null;
  }
}
