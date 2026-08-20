import { prisma } from "@/lib/prisma";
export async function createFlightNotification(userId: string, title: string, message: string, metadata: Record<string, unknown>) { return prisma.notification.create({ data: { userId, title, message, type: "flight", metadata } }); }
