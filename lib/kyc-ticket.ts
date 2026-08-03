import { prisma } from "@/lib/prisma";

/**
 * Genere un numero de ticket KYC lisible, cree au moment de la soumission
 * du dossier. Format : KYC-123456
 */
export function generateKycTicket(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `KYC-${n}`;
}

/**
 * Les metadata des notifications sont parfois stockees en JSON natif,
 * parfois en chaine JSON. Cette fonction normalise les deux cas.
 */
export function parseNotificationMetadata(raw: unknown): Record<string, any> {
  if (!raw) return {};
  try {
    if (typeof raw === "string") return JSON.parse(raw) || {};
    if (typeof raw === "object") return raw as Record<string, any>;
  } catch {
    return {};
  }
  return {};
}

/**
 * Recupere le ticket KYC cree lors de la soumission du dossier.
 * Si aucun ticket n'existe (ancien dossier), un nouveau est genere
 * afin que la notification de decision porte toujours une reference.
 */
export async function getOrCreateKycTicket(userId: string): Promise<string> {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { metadata: true },
    });

    for (const notif of notifications) {
      const meta = parseNotificationMetadata(notif.metadata);
      const ticket = meta?.ticket ? String(meta.ticket) : "";
      if (ticket.startsWith("KYC-")) return ticket;
    }
  } catch (error) {
    console.error("[KYC_TICKET] Lecture du ticket impossible:", error);
  }
  return generateKycTicket();
}

/**
 * Construit le nom affiche dans la notification KYC.
 */
export function buildUserDisplayName(user: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.name || fullName || user.username || user.email || "Utilisateur";
}
